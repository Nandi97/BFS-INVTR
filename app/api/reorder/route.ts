import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeAvgMonthly, SAFETY_DAYS } from "@/lib/sales-calc";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId       = searchParams.get("locationId");
  const urgencyFilter    = searchParams.get("urgency") ?? "all"; // all | urgent | low
  const search           = searchParams.get("search") ?? "";
  const includeInactive  = searchParams.get("includeInactive") === "true";

  const inventoryItems = await prisma.inventory.findMany({
    where: {
      ...(locationId ? { locationId } : {}),
      location: { isActive: includeInactive ? undefined : true },
      product: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { sku: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
    },
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          salesRecords: {
            orderBy: [{ year: "desc" }, { month: "desc" }],
            take: 12,
          },
        },
      },
      location: true,
    },
    orderBy: { product: { name: "asc" } },
  });

  const rows = inventoryItems
    .map((inv) => {
      const { avgMonthly, monthsUsed, confident } = computeAvgMonthly(inv.product.salesRecords);

      const monthsRemaining = avgMonthly > 0 ? inv.quantity / avgMonthly : null;
      const targetMonths    = inv.product.targetStockMonths ?? 6;
      const leadTimeDays    = inv.product.brand?.leadTimeDays ?? 30;

      // Live reorderPoint — always reflects current lead time settings without
      // needing a manual Recalculate. Falls back to stored value only when
      // there is no sales data to compute from.
      const reorderPoint = avgMonthly > 0
        ? Math.ceil(avgMonthly * (leadTimeDays + SAFETY_DAYS) / 30)
        : inv.reorderPoint;

      const urgency: "out" | "urgent" | "low" | "ok" =
        inv.quantity <= 0
          ? "out"
          : reorderPoint > 0 && inv.quantity <= reorderPoint
          ? "urgent"
          : monthsRemaining !== null && monthsRemaining <= targetMonths
          ? "low"
          : "ok";

      const suggestedOrderQty = avgMonthly > 0
        ? Math.ceil(avgMonthly * targetMonths)
        : inv.reorderQty > 0
        ? inv.reorderQty
        : null;

      return {
        inventoryId: inv.id,
        productId: inv.productId,
        locationId: inv.locationId,
        product: {
          id: inv.product.id,
          name: inv.product.name,
          sku: inv.product.sku,
          barcode: inv.product.barcode,
          unit: inv.product.unit,
          brand: inv.product.brand,
          category: inv.product.category,
        },
        location: inv.location,
        quantity: inv.quantity,
        minQuantity: inv.minQuantity,
        reorderPoint,
        reorderQty: inv.reorderQty,
        avgMonthly: Math.round(avgMonthly * 10) / 10,
        monthsRemaining: monthsRemaining !== null ? Math.round(monthsRemaining * 10) / 10 : null,
        suggestedOrderQty,
        urgency,
        salesMonths: monthsUsed,
        confident,
      };
    })
    .filter((r) => {
      if (urgencyFilter === "urgent") return r.urgency === "out" || r.urgency === "urgent";
      if (urgencyFilter === "low") return r.urgency === "low";
      // "all" = only items that need attention
      return r.urgency !== "ok";
    })
    .sort((a, b) => {
      const priority = { out: 0, urgent: 1, low: 2, ok: 3 };
      if (priority[a.urgency] !== priority[b.urgency]) {
        return priority[a.urgency] - priority[b.urgency];
      }
      return (a.monthsRemaining ?? 999) - (b.monthsRemaining ?? 999);
    });

  return NextResponse.json({ data: rows, total: rows.length });
}
