import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from       = searchParams.get("from") ?? undefined;
  const to         = searchParams.get("to")   ?? undefined;
  const locationId = searchParams.get("locationId") ?? undefined;
  const brandId    = searchParams.get("brandId")    ?? undefined;
  const type       = searchParams.get("type") ?? undefined;

  const where = {
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
          },
        }
      : {}),
    ...(locationId ? { locationId } : {}),
    ...(type       ? { type: type as never } : {}),
    product: { isActive: true, ...(brandId ? { brandId } : {}) },
  };

  const rows = await prisma.stockMovement.findMany({
    where,
    include: {
      product:  { include: { brand: true } },
      location: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const data = rows.map((m) => ({
    id:           m.id,
    createdAt:    m.createdAt.toISOString(),
    productName:  m.product.name,
    sku:          m.product.sku ?? m.product.barcode ?? null,
    brand:        m.product.brand?.name ?? null,
    location:     m.location.name,
    locationCode: m.location.code,
    type:         m.type,
    quantity:     m.quantity,
    balanceAfter: m.balanceAfter,
    reference:    m.reference ?? null,
    notes:        m.notes     ?? null,
  }));

  const inTypes  = ["PURCHASE_RECEIPT", "ADJUSTMENT_IN", "TRANSFER_IN", "OPENING_STOCK", "RECONCILIATION"];
  const outTypes = ["SALE", "ADJUSTMENT_OUT", "TRANSFER_OUT"];
  const totalIn  = data.filter((r) => inTypes.includes(r.type)).reduce((s, r) => s + r.quantity, 0);
  const totalOut = data.filter((r) => outTypes.includes(r.type)).reduce((s, r) => s + r.quantity, 0);

  return NextResponse.json({ data, totalIn, totalOut, total: data.length });
}
