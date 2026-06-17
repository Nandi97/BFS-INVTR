import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireRole("MANAGER");
  if (auth instanceof NextResponse) return auth;

  const { itemId } = await params;
  const body = await request.json();

  const item = await prisma.bfsFulfillmentItem.update({
    where: { id: itemId },
    data: {
      fulfilledRetailQty:     body.fulfilledRetailQty     ?? undefined,
      fulfilledConsumableQty: body.fulfilledConsumableQty ?? undefined,
      isPacked:               body.isPacked               ?? undefined,
      notes:                  body.notes                  ?? undefined,
      unitPrice:              body.unitPrice              ?? undefined,
      productName:            body.productName            ?? undefined,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireRole("MANAGER");
  if (auth instanceof NextResponse) return auth;

  const { itemId } = await params;

  // Only allow deleting walk-in items
  const item = await prisma.bfsFulfillmentItem.findUnique({ where: { id: itemId } });
  if (!item)          return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!item.isWalkIn) return NextResponse.json({ error: "Cannot delete Zenoti line items" }, { status: 400 });

  await prisma.bfsFulfillmentItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
