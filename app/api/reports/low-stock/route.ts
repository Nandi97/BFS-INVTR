import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") ?? undefined;
  const brandId    = searchParams.get("brandId")    ?? undefined;

  const rows = await prisma.inventory.findMany({
    where: {
      product: { isActive: true, ...(brandId ? { brandId } : {}) },
      ...(locationId ? { locationId } : {}),
    },
    include: {
      product: {
        include: {
          brand:    true,
          category: true,
          productSuppliers: {
            where:  { isPreferred: true },
            take:   1,
            select: { cost: true, supplierSku: true, supplier: { select: { name: true, email: true, leadTimeDays: true } } },
          },
        },
      },
      location: { select: { name: true, code: true } },
    },
    orderBy: { product: { name: "asc" } },
  });

  const low = rows.filter((r) => r.quantity <= r.reorderPoint);

  const data = low.map((inv) => {
    const pref = inv.product.productSuppliers[0] ?? null;
    return {
      productId:    inv.productId,
      productName:  inv.product.name,
      sku:          inv.product.sku ?? inv.product.barcode ?? null,
      brand:        inv.product.brand?.name ?? null,
      category:     inv.product.category?.name ?? null,
      location:     inv.location.name,
      locationCode: inv.location.code,
      quantity:     inv.quantity,
      reorderPoint: inv.reorderPoint,
      reorderQty:   inv.reorderQty,
      shortage:     Math.max(0, inv.reorderPoint - inv.quantity),
      isOut:        inv.quantity <= 0,
      supplier:     pref?.supplier?.name    ?? null,
      supplierEmail:pref?.supplier?.email   ?? null,
      leadTimeDays: pref?.supplier?.leadTimeDays ?? null,
      supplierSku:  pref?.supplierSku       ?? null,
      unitCost:     pref?.cost              ?? null,
    };
  });

  return NextResponse.json({
    data,
    outOfStock: data.filter((r) => r.isOut).length,
    lowStock:   data.filter((r) => !r.isOut).length,
    total:      data.length,
  });
}
