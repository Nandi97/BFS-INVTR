# BFS Inventory

Warehouse inventory management for **Beauty First / Beauty Logix** (`order@beautylogix.ca`).

Replaces the Excel-based workflow. Real-time stock visibility across warehouse locations, automated low-stock alerts, and reorder quantity calculations driven by actual sales history — transactions continue in QuickBooks Online.

---

## Stack

| | |
|---|---|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Database** | PostgreSQL (Neon) + Prisma 7 |
| **Auth** | better-auth 1.6 *(schema ready, UI pending)* |
| **UI** | shadcn + Tailwind 4 + recharts |
| **Data** | TanStack Query v5 + axios |
| **Email** | nodemailer via Gmail app password |
| **Excel** | ExcelJS (email attachments + report exports) |

---

## Getting Started

```bash
npm install

cp .env.example .env.local
# Fill in: DATABASE_URL, BETTER_AUTH_SECRET, EMAIL_USER, EMAIL_PASS

npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **After any schema change** run `npx prisma migrate deploy && npx prisma generate`, then restart the dev server — it caches the compiled Prisma client and won't see new fields until restarted.

---

## Initial Data Import

Run once to populate the database from source files:

```bash
# One-time Python env
python3 -m venv /tmp/bfs-venv
/tmp/bfs-venv/bin/pip install requests openpyxl xlrd

# 1. Product catalog + opening stock from Excel spreadsheet
/tmp/bfs-venv/bin/python3 scripts/import_warehouse.py

# 2. Brand lead times + disable direct-supply locations
npx tsx --env-file=.env scripts/seed-lead-times.ts

# 3. QB stock quantities + 12-month sales history + reorder minimums
/tmp/bfs-venv/bin/python3 scripts/import_qb_data.py all

# 4. Set local brands to 2-month stock target
npx tsx --env-file=.env scripts/set-local-target-months.ts
```

**Source files** (Google Drive → `order@beautylogix.ca/My Drive/inventory/`):
- `Wholesale Product Vendors.xlsx WAREHOUSE VERSION.xlsx` — product catalog
- `ProductServiceList__*.xls` — QB stock quantities
- `Beauty Logix Inc_Sales by Product_Service Detail.xlsx` — QB 12-month sales

---

## Features

### ✅ Built

| Route | Feature |
|---|---|
| `/dashboard` | KPI cards (total SKUs, out of stock, low stock, healthy), stock health donut chart, urgent reorder list, recent movements |
| `/products` | Product catalog — brand / category / type filters, search, inline stock levels |
| `/stock` | Per-location inventory, adjust stock, set thresholds |
| `/stock/movements` | Full audit log of every quantity change |
| `/stock/locations` | Manage warehouse and retail locations |
| `/reorder` | Items below reorder point ranked by urgency. "Include direct-supply locations" toggle. "Calculate minimums" button auto-sets reorder points from sales data. |
| `/suppliers` | Vendor contacts and preferred-supplier assignments |
| `/purchase-orders` | Create POs, mark sent, receive items, auto-status (DRAFT → SENT → RECEIVED) |
| `/notifications` | Alert rules for out-of-stock / low-stock / reorder / daily digest. Emails attach a styled XLSX. |
| `/analytics` | Monthly bar chart, top products, YoY comparison, CSV import |
| `/reports` | Stock valuation, low stock, movements, PO history — all CSV exportable |
| `/import-export` | Bulk import products / suppliers / opening stock from CSV; export catalog + stock |
| `/integrations` | QB stock sync (paste CSV), QB sales sync, sync history log |
| `/settings` | Per-product target stock months (1–36), brand lead times — drives reorder calculations |

### ❌ Remaining

| Feature | Notes |
|---|---|
| Shopify Integration | Pull sales from Shopify to complement QB data |
| Authentication | better-auth installed + schema ready; login/signup UI not built |

---

## Reorder Calculations

Reorder values are computed from the last 12 months of sales and each brand's lead time:

```
reorderPoint = ceil(avgMonthly × (leadTimeDays + 7) / 30)   ← stock level to trigger an order
reorderQty   = ceil(avgMonthly × targetStockMonths)          ← how much to order
minQuantity  = ceil(avgMonthly × 7 / 30)                    ← 1-week safety buffer
```

**Brand lead times** (set in Settings → Brand Lead Times or `scripts/seed-lead-times.ts`):
- Local suppliers (Beauty First, Desembre, Fernanda's, Refectocil): **14 days**
- International / Korean / Chinese suppliers: **45 days**

**Target stock months** (set in Settings → Stock Policy):
- Local high-volume: **2 months**
- International non-perishables: **6 months** (default)
- Long-shelf / seasonal: up to **12 months**

Trigger recalculation: Settings → Stock Policy → **Recalculate** button, or:

```bash
/tmp/bfs-venv/bin/python3 scripts/import_qb_data.py minimums
```

---

## Current Data State

| | |
|---|---|
| Active products | 847 |
| Disabled (Inverness — direct-to-store) | 81 |
| Stock records | 665 |
| Monthly sales records | 3,480 (Apr 2025 – Mar 2026) |
| Products with reorder points set | 562 |
| Active locations | BF Warehouse |
| Disabled locations | BF Inverness, BLX Inverness |

---

## Project Structure

```
app/
  (dashboard)/        # All pages
    dashboard/ products/ stock/ reorder/
    suppliers/ purchase-orders/ notifications/
    analytics/ reports/ import-export/
    integrations/ settings/
  api/                # API routes (mirrors page structure)
    products/ brands/ locations/ stock/ reorder/
    purchase-orders/ notifications/ sales/ reports/
    import/ export/ integrations/ settings/

components/
  ui/                 # shadcn components
  dashboard/ products/ stock/ reorder/
  suppliers/ purchase-orders/ notifications/
  analytics/ reports/ import-export/
  integrations/ settings/

hooks/                # TanStack Query hooks (one file per domain)
lib/                  # prisma, axios, mailer, notification-engine, email-xlsx, csv-export
prisma/               # schema.prisma, seed.ts, migrations/
scripts/              # import_warehouse.py, import_qb_data.py, seed-lead-times.ts, set-local-target-months.ts
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://...        # Neon connection string

BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000

# Gmail app password for email notifications
EMAIL_USER=order@beautylogix.ca
EMAIL_PASS=...
```
