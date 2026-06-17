import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { sendMail } from "@/lib/mailer";
import ExcelJS from "exceljs";

async function buildPackingListXlsx(params: {
  orderNumber: string;
  centerName:  string;
  org:         string;
  raisedAt:    Date | null;
  deliverBy:   Date | null;
  items: Array<{
    productCode:            string | null;
    productName:            string;
    requestedRetailQty:     number;
    requestedConsumableQty: number;
    fulfilledRetailQty:     number;
    fulfilledConsumableQty: number;
    notes:                  string | null;
    isWalkIn:               boolean;
  }>;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator  = "BFS Inventory";
  wb.created  = new Date();

  const ws = wb.addWorksheet("Packing List");

  // Title block
  const titleRow = ws.addRow([`PACKING LIST — ${params.centerName.toUpperCase()}`]);
  titleRow.getCell(1).font = { bold: true, size: 14 };
  ws.addRow([`Order #${params.orderNumber} · ${params.org === "bfs" ? "Beauty First Spa" : "Beauty Logix"}`]);
  ws.addRow([
    `Raised: ${params.raisedAt ? new Date(params.raisedAt).toLocaleDateString("en-CA") : "—"}  ·  Deliver by: ${params.deliverBy ? new Date(params.deliverBy).toLocaleDateString("en-CA") : "—"}  ·  Packed: ${new Date().toLocaleDateString("en-CA")}`,
  ]);
  ws.addRow([]);

  // Headers
  ws.columns = [
    { key: "code",      width: 16 },
    { key: "name",      width: 40 },
    { key: "reqRetail", width: 14 },
    { key: "reqCons",   width: 14 },
    { key: "filRetail", width: 14 },
    { key: "filCons",   width: 14 },
    { key: "flag",      width: 12 },
    { key: "notes",     width: 24 },
  ];

  const headerRow = ws.addRow([
    "Product Code", "Product Name",
    "Req Retail", "Req Consumable",
    "Filled Retail", "Filled Consumable",
    "Type", "Notes",
  ]);
  headerRow.eachCell((cell) => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
    cell.font   = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
  headerRow.height = 20;

  params.items.forEach((item, i) => {
    const shortfallRetail = item.fulfilledRetailQty     < item.requestedRetailQty;
    const shortfallCons   = item.fulfilledConsumableQty < item.requestedConsumableQty;
    const shade = i % 2 === 0;

    const r = ws.addRow([
      item.productCode ?? "",
      item.productName,
      item.requestedRetailQty     || "",
      item.requestedConsumableQty || "",
      item.fulfilledRetailQty     || "",
      item.fulfilledConsumableQty || "",
      item.isWalkIn ? "Walk-in" : "",
      item.notes ?? "",
    ]);

    r.eachCell({ includeEmpty: true }, (cell) => {
      if (shade) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      cell.font      = { size: 10 };
      cell.alignment = { vertical: "middle" };
    });

    if (shortfallRetail) {
      r.getCell(5).font = { bold: true, color: { argb: "FFEF4444" }, size: 10 };
    }
    if (shortfallCons) {
      r.getCell(6).font = { bold: true, color: { argb: "FFEF4444" }, size: 10 };
    }
    if (item.isWalkIn) {
      r.getCell(7).font = { color: { argb: "FF8B5CF6" }, italic: true, size: 10 };
    }
    r.height = 18;
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("MANAGER");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const fulfillment = await prisma.bfsFulfillment.findUnique({
    where:   { id },
    include: {
      items: true,
      order: true,
    },
  });

  if (!fulfillment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (fulfillment.status === "SUBMITTED" || fulfillment.status === "INVOICED") {
    return NextResponse.json({ error: "Already submitted" }, { status: 400 });
  }

  const { order } = fulfillment;

  const xlsx = await buildPackingListXlsx({
    orderNumber: order.orderNumber,
    centerName:  order.centerName,
    org:         order.org,
    raisedAt:    order.raisedAt,
    deliverBy:   order.deliverBy,
    items:       fulfillment.items,
  });

  const orgLabel  = order.org === "bfs" ? "Beauty First Spa" : "Beauty Logix";
  const dateStr   = new Date().toLocaleDateString("en-CA");
  const subject   = `Packing List — ${order.centerName} — Order #${order.orderNumber}`;
  const totalRetail      = fulfillment.items.reduce((s, i) => s + i.fulfilledRetailQty,     0);
  const totalConsumable  = fulfillment.items.reduce((s, i) => s + i.fulfilledConsumableQty, 0);
  const walkInCount      = fulfillment.items.filter((i) => i.isWalkIn).length;

  const html = `
    <p>Hi Accounting,</p>
    <p>Attached is the packing list for the following fulfillment:</p>
    <ul>
      <li><strong>Store:</strong> ${order.centerName} (${orgLabel})</li>
      <li><strong>Order #:</strong> ${order.orderNumber}</li>
      <li><strong>Packed on:</strong> ${dateStr}</li>
      <li><strong>Total retail units:</strong> ${totalRetail}</li>
      <li><strong>Total consumable units:</strong> ${totalConsumable}</li>
      ${walkInCount > 0 ? `<li><strong>Walk-in additions:</strong> ${walkInCount} items</li>` : ""}
    </ul>
    <p>Please create the corresponding invoice in QuickBooks.</p>
    <p>— BFS Inventory</p>
  `;

  await sendMail({
    to:      "accounting@beautyfirstspa.com",
    subject,
    html,
    attachments: [
      {
        filename:    `packing-list-${order.centerName.toLowerCase().replace(/\s+/g, "-")}-${order.orderNumber}.xlsx`,
        content:     xlsx,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });

  // Also CC Alvin
  await sendMail({
    to:      "order@beautylogix.ca",
    subject: `[Copy] ${subject}`,
    html,
    attachments: [
      {
        filename:    `packing-list-${order.centerName.toLowerCase().replace(/\s+/g, "-")}-${order.orderNumber}.xlsx`,
        content:     xlsx,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });

  const updated = await prisma.bfsFulfillment.update({
    where: { id },
    data: {
      status:      "SUBMITTED",
      submittedAt: new Date(),
      submittedBy: auth.user.email,
    },
  });

  return NextResponse.json({ ok: true, fulfillment: updated });
}
