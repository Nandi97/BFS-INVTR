import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { productId, locationId, minQuantity, reorderPoint, reorderQty } = body;

  if (!productId || !locationId) {
    return NextResponse.json({ error: "productId and locationId are required" }, { status: 400 });
  }

  const updated = await prisma.inventory.upsert({
    where: { productId_locationId: { productId, locationId } },
    update: {
      ...(minQuantity !== undefined ? { minQuantity: Number(minQuantity) } : {}),
      ...(reorderPoint !== undefined ? { reorderPoint: Number(reorderPoint) } : {}),
      ...(reorderQty !== undefined ? { reorderQty: Number(reorderQty) } : {}),
    },
    create: {
      productId,
      locationId,
      quantity: 0,
      minQuantity: Number(minQuantity ?? 0),
      reorderPoint: Number(reorderPoint ?? 0),
      reorderQty: Number(reorderQty ?? 0),
    },
    include: { product: { include: { brand: true } }, location: true },
  });

  return NextResponse.json(updated);
}
