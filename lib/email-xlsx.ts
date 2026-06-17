import ExcelJS from "exceljs";
import type { StockAlertItem } from "./email-templates";

const RED   = "FFDC2626";
const AMBER = "FFD97706";
const BLACK = "FF111111";
const WHITE = "FFFFFFFF";
const STRIPE = "FFF8F8F8";
const HAIR   = "FFE5E5E5";

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: BLACK } };
    cell.font      = { bold: true, color: { argb: WHITE }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border    = { bottom: { style: "thin", color: { argb: "FF444444" } } };
  });
  row.height = 22;
}

function applyDataRow(row: ExcelJS.Row, shade: boolean) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    if (shade) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE } };
    cell.font      = { size: 10 };
    cell.alignment = { vertical: "middle" };
    cell.border    = { bottom: { style: "hair", color: { argb: HAIR } } };
  });
  row.height = 18;
}

// Excel sheet names: 31-char max, no special chars
function safeSheetName(name: string) {
  return name.replace(/[\\/*?:[\]]/g, "-").slice(0, 31);
}

export async function generateStockAlertXlsx(params: {
  outOfStock: StockAlertItem[];
  lowStock:   StockAlertItem[];
  title:      string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator  = "BFS Inventory";
  wb.created  = new Date();
  wb.modified = new Date();

  // ─── Group by brand ──────────────────────────────────────────────────────────
  type BrandBucket = { out: StockAlertItem[]; low: StockAlertItem[] };
  const buckets = new Map<string, BrandBucket>();

  const slot = (brand: string): BrandBucket => {
    if (!buckets.has(brand)) buckets.set(brand, { out: [], low: [] });
    return buckets.get(brand)!;
  };

  for (const item of params.outOfStock) slot(item.brand ?? "Other").out.push(item);
  for (const item of params.lowStock)   slot(item.brand ?? "Other").low.push(item);

  const sortedBrands = [...buckets.keys()].sort((a, b) => a.localeCompare(b));

  // ─── Summary sheet ───────────────────────────────────────────────────────────
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Count",  key: "count",  width: 12 },
  ];
  applyHeaderStyle(summary.getRow(1));

  const overallRows = [
    { metric: "Out of Stock",     count: params.outOfStock.length },
    { metric: "Low Stock",        count: params.lowStock.length },
    { metric: "Total Attention",  count: params.outOfStock.length + params.lowStock.length },
    { metric: "Report Generated", count: new Date().toLocaleString("en-CA") },
  ];
  overallRows.forEach((d, i) => applyDataRow(summary.addRow(d), i % 2 === 0));

  // Brand breakdown table
  summary.addRow({});
  const brandHeader = summary.addRow({ metric: "Brand", count: "Out of Stock" });
  // add extra cols inline
  brandHeader.getCell(3).value = "Low Stock";
  brandHeader.getCell(4).value = "Total";
  summary.getColumn(3).width = 12;
  summary.getColumn(4).width = 10;
  applyHeaderStyle(brandHeader);

  sortedBrands.forEach((brand, i) => {
    const { out, low } = buckets.get(brand)!;
    const row = summary.addRow({ metric: brand, count: out.length });
    row.getCell(3).value = low.length;
    row.getCell(4).value = out.length + low.length;
    applyDataRow(row, i % 2 === 0);
    if (out.length > 0) {
      row.getCell(2).font = { bold: true, color: { argb: RED },   size: 10 };
    }
    if (low.length > 0) {
      row.getCell(3).font = { bold: true, color: { argb: AMBER }, size: 10 };
    }
  });

  // ─── One sheet per brand ─────────────────────────────────────────────────────
  for (const brand of sortedBrands) {
    const { out, low } = buckets.get(brand)!;
    if (out.length === 0 && low.length === 0) continue;

    const ws = wb.addWorksheet(safeSheetName(brand));
    ws.columns = [
      { header: "Status",        key: "status",   width: 14 },
      { header: "Product",       key: "product",  width: 40 },
      { header: "SKU / Barcode", key: "sku",      width: 18 },
      { header: "Location",      key: "location", width: 18 },
      { header: "Qty on Hand",   key: "qty",      width: 13 },
      { header: "Reorder Point", key: "rp",       width: 13 },
      { header: "Suggest Order", key: "suggest",  width: 13 },
    ];
    applyHeaderStyle(ws.getRow(1));

    let rowIdx = 0;

    // Out of stock first
    for (const item of out) {
      const r = ws.addRow({
        status:   "Out of Stock",
        product:  item.name,
        sku:      item.sku ?? "",
        location: item.location,
        qty:      item.quantity,
        rp:       item.reorderPoint ?? "",
        suggest:  item.suggestedQty ?? "",
      });
      applyDataRow(r, rowIdx % 2 === 0);
      r.getCell("A").font = { bold: true, color: { argb: RED },   size: 10 };
      r.getCell("E").font = { bold: true, color: { argb: RED },   size: 10 };
      rowIdx++;
    }

    // Low stock after
    for (const item of low) {
      const r = ws.addRow({
        status:   "Low Stock",
        product:  item.name,
        sku:      item.sku ?? "",
        location: item.location,
        qty:      item.quantity,
        rp:       item.reorderPoint ?? "",
        suggest:  item.suggestedQty ?? "",
      });
      applyDataRow(r, rowIdx % 2 === 0);
      r.getCell("A").font = { bold: true, color: { argb: AMBER }, size: 10 };
      r.getCell("E").font = { bold: true, color: { argb: AMBER }, size: 10 };
      rowIdx++;
    }

    // Freeze header row
    ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generateDailyDigestXlsx(params: {
  outOfStock:  StockAlertItem[];
  lowStock:    StockAlertItem[];
  totalSKUs:   number;
  healthySKUs: number;
}): Promise<Buffer> {
  return generateStockAlertXlsx({
    outOfStock: params.outOfStock,
    lowStock:   params.lowStock,
    title:      "Daily Digest",
  });
}
