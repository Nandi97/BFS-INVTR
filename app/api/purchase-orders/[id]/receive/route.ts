import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

interface ReceiveItem {
  itemId:      string;
  receivedQty: number;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  const { id } = await params;
  const body = await req.json();
  const { items, notes }: { items: ReceiveItem[]; notes?: string } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (po.status === "CANCELLED" || po.status === "RECEIVED") {
    return NextResponse.json({ error: `Cannot receive a ${po.status} order.` }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    for (const { itemId, receivedQty } of items) {
      if (receivedQty <= 0) continue;

      const poItem = po.items.find((i) => i.id === itemId);
      if (!poItem) continue;

      // Update received qty on item
      await tx.purchaseOrderItem.update({
        where: { id: itemId },
        data: { receivedQty: { increment: receivedQty } },
      });

      // Upsert inventory + log movement
      const inv = await tx.inventory.upsert({
        where: {
          productId_locationId: { productId: poItem.productId, locationId: po.locationId },
        },
        update: { quantity: { increment: receivedQty } },
        create: { productId: poItem.productId, locationId: po.locationId, quantity: receivedQty },
      });

      await tx.stockMovement.create({
        data: {
          productId:   poItem.productId,
          locationId:  po.locationId,
          type:        "PURCHASE_RECEIPT",
          quantity:    receivedQty,
          balanceAfter: inv.quantity,
          reference:   po.poNumber,
          notes:       notes ?? null,
        },
      });
    }

    // Recalculate overall PO status
    const updatedItems = await tx.purchaseOrderItem.findMany({ where: { orderId: id } });
    const allReceived     = updatedItems.every((i) => i.receivedQty >= i.quantity);
    const someReceived    = updatedItems.some((i) => i.receivedQty > 0);
    const newStatus       = allReceived ? "RECEIVED" : someReceived ? "PARTIALLY_RECEIVED" : po.status;

    return tx.purchaseOrder.update({
      where: { id },
      data: {
        status:     newStatus as never,
        receivedAt: allReceived ? new Date() : null,
      },
      include: {
        supplier: true,
        location: true,
        items: { include: { product: { include: { brand: true } } } },
      },
    });
  });

  return NextResponse.json(result);
}
