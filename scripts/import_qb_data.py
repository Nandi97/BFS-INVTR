"""
Import QB data into BFS Inventory from two files:

  1. ProductServiceList__*.xls  → stock quantities + reorder points
  2. Beauty Logix Inc_Sales by Product_Service Detail.xlsx → monthly sales

Run from the bfs-inventory project root with the dev server running:
    /tmp/bfs-venv/bin/python3 scripts/import_qb_data.py
"""

import sys, json, math, re, glob, os
from collections import defaultdict
import requests
import xlrd
import openpyxl

BASE_URL   = "http://localhost:3000/api"
LOCATION   = "BF Warehouse"
BATCH_SIZE = 200

# ── File resolution ───────────────────────────────────────────────────────────
# Stock XLS: look in qb-imports/ first (local drop folder), fall back to Drive
_SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_SCRIPT_DIR)
_DROP_DIR     = os.path.join(_PROJECT_ROOT, "qb-imports")
_DRIVE_DIR    = "/Users/alvinmaina/Library/CloudStorage/GoogleDrive-order@beautylogix.ca/My Drive/inventory"

def _find_latest_stock_xls():
    candidates = sorted(
        glob.glob(os.path.join(_DROP_DIR, "ProductServiceList*.xls")) +
        glob.glob(os.path.join(_DROP_DIR, "ProductServiceList*.xlsx")) +
        glob.glob(os.path.join(_DRIVE_DIR, "ProductServiceList*.xls")) +
        glob.glob(os.path.join(_DRIVE_DIR, "ProductServiceList*.xlsx")),
        reverse=True,
    )
    if not candidates:
        raise FileNotFoundError(
            f"No ProductServiceList*.xls found in {_DROP_DIR} or {_DRIVE_DIR}"
        )
    path = candidates[0]
    print(f"  Using stock file: {path}")
    return path

SALES_FILE = os.path.join(_DRIVE_DIR, "Beauty Logix Inc_Sales by Product_Service Detail.xlsx")
STOCK_FILE = None  # resolved lazily via _find_latest_stock_xls()

MONTH_NAMES = {
    "january":1,"february":2,"march":3,"april":4,"may":5,"june":6,
    "july":7,"august":8,"september":9,"october":10,"november":11,"december":12,
}


# ─── Stock ───────────────────────────────────────────────────────────────────

def load_stock_rows():
    wb   = xlrd.open_workbook(_find_latest_stock_xls())
    ws   = wb.sheets()[0]
    rows = []
    skipped = 0
    for i in range(1, ws.nrows):
        r = ws.row_values(i)
        item_type = str(r[3]).strip()
        if item_type.lower() != "inventory":
            skipped += 1
            continue

        name = str(r[0]).strip()
        sku  = str(r[2]).strip() if r[2] else ""
        try:
            qty = float(r[13]) if r[13] != "" else 0.0
        except (ValueError, TypeError):
            qty = 0.0
        try:
            rp = float(r[14]) if r[14] != "" else None
        except (ValueError, TypeError):
            rp = None

        row = {"itemName": name, "qty": qty}
        if sku:
            row["sku"] = sku
        if rp is not None:
            row["reorderPoint"] = rp

        rows.append(row)

    print(f"  Stock rows: {len(rows)} inventory items ({skipped} non-inventory skipped)")
    return rows


def import_stock(rows):
    print(f"\n── Stock import ({len(rows)} rows) ──")
    total_synced = total_skipped = 0
    all_errors = []

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        resp  = requests.post(
            f"{BASE_URL}/integrations/quickbooks/sync-stock",
            json={"rows": batch, "location": LOCATION},
            timeout=120,
        )
        if resp.status_code != 200:
            print(f"  ERROR batch {i//BATCH_SIZE + 1}: {resp.status_code} — {resp.text[:200]}")
            continue

        d = resp.json()
        total_synced  += d.get("synced", 0)
        total_skipped += d.get("skipped", 0)
        all_errors    += d.get("errors", [])
        print(f"  Batch {i//BATCH_SIZE + 1}: {d.get('synced',0)} synced, {d.get('skipped',0)} skipped")

    print(f"  Total: {total_synced} synced, {total_skipped} skipped")
    if all_errors:
        print(f"  First 20 errors:")
        for e in all_errors[:20]:
            print(f"    {e}")
    return total_synced, total_skipped


# ─── Sales ───────────────────────────────────────────────────────────────────

def parse_month_header(val):
    """'July 2025' → (7, 2025) or None"""
    if not val or not isinstance(val, str):
        return None
    val = val.strip()
    if val.lower().startswith("total"):
        return None
    m = re.match(r'^([A-Za-z]+)\s+(\d{4})$', val)
    if not m:
        return None
    month = MONTH_NAMES.get(m.group(1).lower())
    if not month:
        return None
    return month, int(m.group(2))


def load_sales_rows():
    wb = openpyxl.load_workbook(SALES_FILE, read_only=True, data_only=True)
    ws = wb.active

    # key: (sku_or_name, year, month) → {qty, revenue, itemName, sku}
    agg = defaultdict(lambda: {"qty": 0.0, "revenue": 0.0, "itemName": "", "sku": ""})

    current_month = None
    current_year  = None
    tx_count = 0
    skip_count = 0

    for row in ws.iter_rows(values_only=True):
        # Month header row
        header = parse_month_header(row[0])
        if header:
            current_month, current_year = header
            continue

        # Must have a date in col[1] to be a transaction row
        date_val = row[1]
        if not date_val:
            continue
        if not (isinstance(date_val, str) and date_val.count("/") == 2):
            continue

        product_name = str(row[2]).strip() if row[2] else ""
        if not product_name:
            skip_count += 1
            continue  # discount / blank product rows

        if current_month is None or current_year is None:
            skip_count += 1
            continue

        try:
            qty     = float(row[7]) if row[7] is not None else 0.0
            revenue = float(row[9]) if row[9] is not None else 0.0
        except (ValueError, TypeError):
            skip_count += 1
            continue

        sku = str(row[11]).strip() if row[11] else ""
        key = (sku if sku else product_name, current_year, current_month)

        agg[key]["qty"]      += qty
        agg[key]["revenue"]  += revenue
        agg[key]["itemName"]  = product_name
        agg[key]["sku"]       = sku
        tx_count += 1

    print(f"  Sales transactions processed: {tx_count} ({skip_count} skipped)")
    print(f"  Unique product-month combinations: {len(agg)}")

    rows = []
    for (_, year, month), v in agg.items():
        row = {
            "itemName": v["itemName"],
            "year":     year,
            "month":    month,
            "quantity": round(v["qty"]),
            "revenue":  round(v["revenue"], 2),
        }
        if v["sku"]:
            row["sku"] = v["sku"]
        rows.append(row)

    return rows


def import_sales(rows):
    print(f"\n── Sales import ({len(rows)} product-month rows) ──")
    total_synced = total_skipped = 0
    all_errors = []

    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        resp  = requests.post(
            f"{BASE_URL}/integrations/quickbooks/sync-sales",
            json={"rows": batch},
            timeout=120,
        )
        if resp.status_code != 200:
            print(f"  ERROR batch {i//BATCH_SIZE + 1}: {resp.status_code} — {resp.text[:200]}")
            continue

        d = resp.json()
        total_synced  += d.get("synced", 0)
        total_skipped += d.get("skipped", 0)
        all_errors    += d.get("errors", [])
        print(f"  Batch {i//BATCH_SIZE + 1}: {d.get('synced',0)} synced, {d.get('skipped',0)} skipped")

    print(f"  Total: {total_synced} synced, {total_skipped} skipped")
    if all_errors:
        print(f"  First 20 errors:")
        for e in all_errors[:20]:
            print(f"    {e}")
    return total_synced, total_skipped


# ─── Calculate minimums ───────────────────────────────────────────────────────

def calculate_minimums():
    print(f"\n── Calculate minimums ──")
    resp = requests.post(f"{BASE_URL}/inventory/calculate-minimums", json={}, timeout=120)
    if resp.status_code != 200:
        print(f"  ERROR: {resp.status_code} — {resp.text[:200]}")
        return
    d = resp.json()
    print(f"  Updated: {d.get('updated',0)}, Skipped: {d.get('skipped',0)}, Total: {d.get('total',0)}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    # modes: all | stock | sales | minimums

    print("=== BFS QB Data Import ===\n")

    if mode in ("all", "stock"):
        print("Loading stock data...")
        stock_rows = load_stock_rows()
        import_stock(stock_rows)

    if mode in ("all", "sales"):
        print("\nLoading sales data...")
        sales_rows = load_sales_rows()
        import_sales(sales_rows)

    if mode in ("all", "minimums"):
        calculate_minimums()

    print("\nDone.")


if __name__ == "__main__":
    main()
