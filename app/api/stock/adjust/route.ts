import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function POST(req: NextRequest) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  const body = await req.json();
  const { productId, locationId, type, quantity, reference, notes } = body;

  if (!productId || !locationId || !type || quantity === undefined) {
    return NextResponse.json({ error: "productId, locationId, type, and quantity are required" }, { status: 400 });
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty < 0) {
    return NextResponse.json({ error: "quantity must be a non-negative number" }, { status: 400 });
  }

  const SUBTRACT_TYPES = ["SALE", "ADJUSTMENT_OUT", "TRANSFER_OUT", "INTERNAL_USE"];
  const delta = SUBTRACT_TYPES.includes(type) ? -qty : qty;

  const result = await prisma.$transaction(async (tx) => {
    let inv = await tx.inventory.findUnique({
      where: { productId_locationId: { productId, locationId } },
    });

    if (!inv) {
      inv = await tx.inventory.create({
        data: { productId, locationId, quantity: 0 },
      });
    }

    const newBalance = inv.quantity + delta;

    const updated = await tx.inventory.update({
      where: { productId_locationId: { productId, locationId } },
      data: { quantity: newBalance },
      include: { product: { include: { brand: true } }, location: true },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId,
        locationId,
        type,
        quantity: qty,
        balanceAfter: newBalance,
        reference: reference ?? null,
        notes: notes ?? null,
      },
    });

    return { inventory: updated, movement };
  });

  return NextResponse.json(result, { status: 201 });
}
