import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/inventory/calculate-minimums
 *
 *   reorderPoint = ceil(avgMonthly × (leadTimeDays + safetyDays) / 30)
 *   minQuantity  = ceil(avgMonthly × safetyDays / 30)
 *   reorderQty   = ceil(avgMonthly × product.targetStockMonths)
 *
 * leadTimeDays from brand; targetStockMonths from product (default 6).
 * Products with no sales data are skipped.
 */

const SAFETY_DAYS = 7;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const locationId: string | undefined = body.locationId;

  const items = await prisma.inventory.findMany({
    where: {
      ...(locationId ? { locationId } : {}),
      location: { isActive: true },
      product:  { isActive: true },
    },
    include: {
      product: {
        include: {
          brand: { select: { leadTimeDays: true } },
          salesRecords: {
            orderBy: [{ year: "desc" }, { month: "desc" }],
            take: 12,
          },
        },
      },
    },
  });

  let updated = 0, skipped = 0;

  for (const inv of items) {
    const sales = inv.product.salesRecords;
    if (sales.length === 0) { skipped++; continue; }

    const avgMonthly   = sales.reduce((s, r) => s + r.quantity, 0) / sales.length;
    if (avgMonthly <= 0) { skipped++; continue; }

    const leadTimeDays      = inv.product.brand?.leadTimeDays ?? 30;
    const targetStockMonths = inv.product.targetStockMonths;
    const reorderPoint      = Math.ceil(avgMonthly * (leadTimeDays + SAFETY_DAYS) / 30);
    const minQuantity       = Math.ceil(avgMonthly * SAFETY_DAYS / 30);
    const reorderQty        = Math.ceil(avgMonthly * targetStockMonths);

    await prisma.inventory.update({
      where: { id: inv.id },
      data:  { reorderPoint, minQuantity, reorderQty },
    });
    updated++;
  }

  return NextResponse.json({ updated, skipped, total: items.length });
}

/** GET: preview without applying */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId: string | undefined = searchParams.get("locationId") ?? undefined;

  const items = await prisma.inventory.findMany({
    where: {
      ...(locationId ? { locationId } : {}),
      location: { isActive: true },
      product:  { isActive: true },
    },
    include: {
      product: {
        include: {
          brand: { select: { name: true, leadTimeDays: true } },
          salesRecords: {
            orderBy: [{ year: "desc" }, { month: "desc" }],
            take: 12,
          },
        },
      },
      location: { select: { name: true } },
    },
    take: 20,
  });

  const preview = items
    .map((inv) => {
      const sales = inv.product.salesRecords;
      if (sales.length === 0) return null;
      const avgMonthly        = sales.reduce((s, r) => s + r.quantity, 0) / sales.length;
      if (avgMonthly <= 0) return null;
      const leadTimeDays      = inv.product.brand?.leadTimeDays ?? 30;
      const targetStockMonths = inv.product.targetStockMonths;
      return {
        product:          inv.product.name,
        brand:            inv.product.brand?.name,
        location:         inv.location.name,
        avgMonthly:       Math.round(avgMonthly * 10) / 10,
        leadTimeDays,
        targetStockMonths,
        reorderPoint:     Math.ceil(avgMonthly * (leadTimeDays + SAFETY_DAYS) / 30),
        minQuantity:      Math.ceil(avgMonthly * SAFETY_DAYS / 30),
        reorderQty:       Math.ceil(avgMonthly * targetStockMonths),
        currentReorderAt: inv.reorderPoint,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ preview });
}
