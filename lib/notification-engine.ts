import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { generateStockAlertXlsx } from "@/lib/email-xlsx";
import type { StockAlertItem } from "@/lib/email-templates";
import { dailyDigestTemplate } from "@/lib/email-templates";

async function getOutOfStockItems(): Promise<StockAlertItem[]> {
  const rows = await prisma.inventory.findMany({
    where:   { quantity: { lte: 0 }, product: { isActive: true } },
    include: { product: { include: { brand: true } }, location: true },
  });
  return rows.map((r) => ({
    name:         r.product.name,
    brand:        r.product.brand?.name,
    sku:          r.product.sku ?? r.product.barcode ?? undefined,
    location:     r.location.name,
    quantity:     r.quantity,
    suggestedQty: isFinite(r.reorderQty) && r.reorderQty > 0 ? r.reorderQty : undefined,
  }));
}

async function getLowStockItems(): Promise<StockAlertItem[]> {
  // Filter at DB level: quantity > 0 AND reorderPoint > 0 AND quantity <= reorderPoint
  const rows = await prisma.$queryRaw<
    { id: string; name: string; brand: string | null; sku: string | null; barcode: string | null; location: string; quantity: number; reorderPoint: number; reorderQty: number }[]
  >`
    SELECT
      i.id,
      p.name,
      b.name  AS brand,
      p.sku,
      p.barcode,
      l.name  AS location,
      i.quantity,
      i."reorderPoint",
      i."reorderQty"
    FROM "Inventory" i
    JOIN "Product"  p ON p.id = i."productId"  AND p."isActive" = true
    JOIN "Location" l ON l.id = i."locationId"
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    WHERE i.quantity > 0
      AND i."reorderPoint" > 0
      AND i.quantity <= i."reorderPoint"
    ORDER BY (i.quantity / i."reorderPoint") ASC
  `;
  return rows.map((r) => ({
    name:         r.name,
    brand:        r.brand ?? undefined,
    sku:          r.sku ?? r.barcode ?? undefined,
    location:     r.location,
    quantity:     Number(r.quantity),
    reorderPoint: Number(r.reorderPoint),
    suggestedQty: isFinite(Number(r.reorderQty)) && Number(r.reorderQty) > 0 ? Number(r.reorderQty) : undefined,
  }));
}

async function logEmail(params: {
  type:       string;
  subject:    string;
  recipients: string[];
  status:     "SENT" | "FAILED";
  error?:     string;
}) {
  await prisma.emailLog.create({
    data: {
      type:       params.type as never,
      subject:    params.subject,
      recipients: params.recipients,
      status:     params.status,
      error:      params.error ?? null,
      sentAt:     params.status === "SENT" ? new Date() : null,
    },
  });
}

/** Minimal HTML body — full detail is in the XLSX attachment. */
function summaryHtml(title: string, outCount: number, lowCount: number): string {
  const date = new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f8f8; margin: 0; padding: 24px; color: #111; }
  .card { background: #fff; border-radius: 10px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .header { background: #111; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 18px; font-weight: 600; }
  .header p  { margin: 4px 0 0; font-size: 12px; color: #999; }
  .body { padding: 28px 32px; font-size: 14px; line-height: 1.7; color: #444; }
  .stats { display: flex; gap: 16px; margin: 16px 0; }
  .stat  { flex: 1; border-radius: 8px; padding: 14px 16px; }
  .stat-red   { background: #fef2f2; border: 1px solid #fecaca; }
  .stat-amber { background: #fffbeb; border: 1px solid #fde68a; }
  .stat h2 { margin: 0 0 2px; font-size: 26px; font-weight: 700; }
  .stat-red h2   { color: #dc2626; }
  .stat-amber h2 { color: #d97706; }
  .stat p  { margin: 0; font-size: 12px; color: #888; }
  .note { font-size: 12px; color: #aaa; margin-top: 20px; }
  .btn  { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #111; color: #fff; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; }
  .footer { padding: 14px 32px; border-top: 1px solid #f0f0f0; font-size: 11px; color: #aaa; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>BFS Inventory</h1>
    <p>${title} · ${date}</p>
  </div>
  <div class="body">
    <p>Please find the full stock alert details in the attached spreadsheet.</p>
    <div class="stats">
      <div class="stat stat-red"><h2>${outCount}</h2><p>Out of stock</p></div>
      <div class="stat stat-amber"><h2>${lowCount}</h2><p>Low stock</p></div>
    </div>
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reorder">Open Reorder Page →</a>
    <p class="note">Full details — product names, SKUs, quantities, and suggested order quantities — are in the attached Excel file.</p>
  </div>
  <div class="footer">Beauty First / Beauty Logix · Automated alert from BFS Inventory</div>
</div>
</body>
</html>`;
}

export async function runAlertRules(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const rules = await prisma.alertRule.findMany({ where: { isActive: true } });
  let sent = 0, skipped = 0;
  const errors: string[] = [];

  for (const rule of rules) {
    if (rule.recipients.length === 0) { skipped++; continue; }

    try {
      let subject = "";
      let html    = "";
      let xlsxBuf: Buffer | null = null;
      let xlsxFilename = "stock-alert.xlsx";

      if (rule.type === "OUT_OF_STOCK") {
        const items = await getOutOfStockItems();
        if (items.length === 0) { skipped++; continue; }
        subject     = `Out of Stock Alert — ${items.length} product${items.length !== 1 ? "s" : ""}`;
        html        = summaryHtml("Out of Stock Alert", items.length, 0);
        xlsxBuf     = await generateStockAlertXlsx({ outOfStock: items, lowStock: [], title: "Out of Stock" });
        xlsxFilename = `out-of-stock-${new Date().toISOString().slice(0, 10)}.xlsx`;

      } else if (rule.type === "LOW_STOCK") {
        const items = await getLowStockItems();
        if (items.length === 0) { skipped++; continue; }
        subject     = `Low Stock Alert — ${items.length} product${items.length !== 1 ? "s" : ""}`;
        html        = summaryHtml("Low Stock Alert", 0, items.length);
        xlsxBuf     = await generateStockAlertXlsx({ outOfStock: [], lowStock: items, title: "Low Stock" });
        xlsxFilename = `low-stock-${new Date().toISOString().slice(0, 10)}.xlsx`;

      } else if (rule.type === "REORDER_NEEDED") {
        const [outItems, lowItems] = await Promise.all([getOutOfStockItems(), getLowStockItems()]);
        if (outItems.length === 0 && lowItems.length === 0) { skipped++; continue; }
        subject     = `Reorder Needed — ${outItems.length + lowItems.length} product${(outItems.length + lowItems.length) !== 1 ? "s" : ""}`;
        html        = summaryHtml("Reorder Needed", outItems.length, lowItems.length);
        xlsxBuf     = await generateStockAlertXlsx({ outOfStock: outItems, lowStock: lowItems, title: "Reorder" });
        xlsxFilename = `reorder-${new Date().toISOString().slice(0, 10)}.xlsx`;

      } else if (rule.type === "DAILY_DIGEST") {
        const [totalProducts, outOfStock, allInv] = await Promise.all([
          prisma.inventory.count({ where: { product: { isActive: true } } }),
          prisma.inventory.count({ where: { quantity: { lte: 0 }, product: { isActive: true } } }),
          prisma.inventory.findMany({ where: { product: { isActive: true } } }),
        ]);
        const lowStock     = allInv.filter((r) => r.quantity > 0 && r.reorderPoint > 0 && r.quantity <= r.reorderPoint).length;
        const healthyStock = Math.max(0, totalProducts - outOfStock - lowStock);

        const movements = await prisma.stockMovement.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { product: true, location: true },
        });

        subject = `Daily Inventory Digest — ${new Date().toLocaleDateString("en-CA")}`;
        html    = dailyDigestTemplate({
          totalProducts,
          outOfStock,
          lowStock,
          healthyStock,
          recentMovements: movements.map((m) => ({
            product:  m.product.name,
            type:     m.type,
            qty:      ["SALE", "ADJUSTMENT_OUT", "TRANSFER_OUT"].includes(m.type) ? -m.quantity : m.quantity,
            location: m.location.name,
          })),
        });

        // Attach XLSX only if there are alerts
        if (outOfStock > 0 || lowStock > 0) {
          const [outItems, lowItems] = await Promise.all([getOutOfStockItems(), getLowStockItems()]);
          xlsxBuf     = await generateStockAlertXlsx({ outOfStock: outItems, lowStock: lowItems, title: "Daily Digest" });
          xlsxFilename = `digest-${new Date().toISOString().slice(0, 10)}.xlsx`;
        }
      } else {
        skipped++;
        continue;
      }

      await sendMail({
        to:      rule.recipients,
        subject,
        html,
        attachments: xlsxBuf ? [{ filename: xlsxFilename, content: xlsxBuf, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }] : undefined,
      });
      await logEmail({ type: rule.type, subject, recipients: rule.recipients, status: "SENT" });
      await prisma.alertRule.update({ where: { id: rule.id }, data: { lastTriggeredAt: new Date() } });
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Rule "${rule.name}": ${msg}`);
      await logEmail({
        type:       rule.type,
        subject:    `Failed: ${rule.name}`,
        recipients: rule.recipients,
        status:     "FAILED",
        error:      msg,
      }).catch(() => {});
    }
  }

  return { processed: rules.length, sent, skipped, errors };
}
