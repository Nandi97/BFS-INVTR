import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from       = searchParams.get("from") ?? undefined;
  const to         = searchParams.get("to")   ?? undefined;
  const supplierId = searchParams.get("supplierId") ?? undefined;
  const status     = searchParams.get("status")     ?? undefined;

  const where = {
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
          },
        }
      : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(status     ? { status: status as never } : {}),
  };

  const orders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      supplier: { select: { name: true } },
      location: { select: { name: true, code: true } },
      items: {
        include: { product: { select: { name: true, sku: true, barcode: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const data = orders.map((po) => {
    const totalCost    = po.items.reduce((s, i) => s + (i.unitCost ?? 0) * i.quantity,    0);
    const totalReceived = po.items.reduce((s, i) => s + i.receivedQty, 0);
    const totalOrdered  = po.items.reduce((s, i) => s + i.quantity,    0);
    return {
      id:           po.id,
      poNumber:     po.poNumber,
      createdAt:    po.createdAt.toISOString(),
      sentAt:       po.sentAt?.toISOString()     ?? null,
      receivedAt:   po.receivedAt?.toISOString() ?? null,
      supplier:     po.supplier.name,
      location:     po.location.name,
      locationCode: po.location.code,
      status:       po.status,
      lineItems:    po.items.length,
      totalOrdered,
      totalReceived,
      totalCost:    Math.round(totalCost * 100) / 100,
    };
  });

  const grandTotal   = data.reduce((s, r) => s + r.totalCost, 0);
  const totalOrdered = data.reduce((s, r) => s + r.totalOrdered, 0);

  return NextResponse.json({
    data,
    grandTotal: Math.round(grandTotal * 100) / 100,
    totalOrdered,
    total: data.length,
  });
}
