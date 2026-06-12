import ExcelJS from "exceljs";
import type { StockAlertItem } from "./email-templates";

const BRAND_COL  = "A";
const PROD_COL   = "B";
const SKU_COL    = "C";
const LOC_COL    = "D";
const QTY_COL    = "E";
const RP_COL     = "F";
const SUGGEST_COL = "G";

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
    cell.font   = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF444444" } },
    };
  });
  row.height = 22;
}

function applyDataRow(row: ExcelJS.Row, shade: boolean) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    if (shade) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8F8F8" } };
    }
    cell.font      = { size: 10 };
    cell.alignment = { vertical: "middle" };
    cell.border    = { bottom: { style: "hair", color: { argb: "FFE5E5E5" } } };
  });
  row.height = 18;
}

function setColumns(sheet: ExcelJS.Worksheet, showReorderPoint: boolean) {
  sheet.columns = [
    { header: "Brand",           key: "brand",    width: 18 },
    { header: "Product",         key: "product",  width: 38 },
    { header: "SKU / Barcode",   key: "sku",      width: 18 },
    { header: "Location",        key: "location", width: 18 },
    { header: "Qty on Hand",     key: "qty",      width: 14 },
    ...(showReorderPoint
      ? [{ header: "Reorder Point", key: "rp",   width: 14 } as ExcelJS.Column]
      : []),
    { header: "Suggest Order",   key: "suggest",  width: 14 },
  ];
}

export async function generateStockAlertXlsx(params: {
  outOfStock:  StockAlertItem[];
  lowStock:    StockAlertItem[];
  title:       string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator  = "BFS Inventory";
  wb.created  = new Date();
  wb.modified = new Date();

  // ─── Summary sheet ────────────────────────────────────────────────────────
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Count",  key: "count",  width: 12 },
  ];
  applyHeaderStyle(summary.getRow(1));
  const summaryData = [
    { metric: "Out of stock",    count: params.outOfStock.length },
    { metric: "Low stock",       count: params.lowStock.length },
    { metric: "Total attention", count: params.outOfStock.length + params.lowStock.length },
    { metric: "Report generated", count: new Date().toLocaleString("en-CA") },
  ];
  summaryData.forEach((d, i) => {
    const r = summary.addRow(d);
    applyDataRow(r, i % 2 === 0);
  });

  // ─── Out of stock sheet ────────────────────────────────────────────────────
  if (params.outOfStock.length > 0) {
    const ws = wb.addWorksheet("Out of Stock");
    setColumns(ws, false);
    applyHeaderStyle(ws.getRow(1));

    params.outOfStock.forEach((item, i) => {
      const r = ws.addRow({
        brand:   item.brand ?? "",
        product: item.name,
        sku:     item.sku ?? "",
        location: item.location,
        qty:     item.quantity,
        suggest: item.suggestedQty ?? "",
      });
      applyDataRow(r, i % 2 === 0);
      // Colour qty red for out-of-stock
      const qtyCell = r.getCell(QTY_COL);
      qtyCell.font = { bold: true, color: { argb: "FFDC2626" }, size: 10 };
    });
  }

  // ─── Low stock sheet ──────────────────────────────────────────────────────
  if (params.lowStock.length > 0) {
    const ws = wb.addWorksheet("Low Stock");
    setColumns(ws, true);
    applyHeaderStyle(ws.getRow(1));

    params.lowStock.forEach((item, i) => {
      const r = ws.addRow({
        brand:   item.brand ?? "",
        product: item.name,
        sku:     item.sku ?? "",
        location: item.location,
        qty:     item.quantity,
        rp:      item.reorderPoint ?? "",
        suggest: item.suggestedQty ?? "",
      });
      applyDataRow(r, i % 2 === 0);
      const qtyCell = r.getCell(QTY_COL);
      qtyCell.font = { bold: true, color: { argb: "FFD97706" }, size: 10 };
    });
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
