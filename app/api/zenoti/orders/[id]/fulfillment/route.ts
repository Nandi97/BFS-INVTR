import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

// GET — return existing or create a new fulfillment shell
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("MANAGER");
  if (auth instanceof NextResponse) return auth;

  const { id: orderId } = await params;

  const order = await prisma.zenotiOrder.findUnique({
    where: { id: orderId },
    include: { items: true, fulfillment: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.fulfillment) {
    return NextResponse.json(order.fulfillment);
  }

  // Match Zenoti product codes to BFS products by barcode
  const productCodes = order.items.map((i) => i.productCode).filter(Boolean);
  const products = await prisma.product.findMany({
    where: { barcode: { in: productCodes } },
    select: { id: true, barcode: true, sku: true, name: true },
  });
  const byBarcode = new Map(products.map((p) => [p.barcode, p]));

  const fulfillment = await prisma.bfsFulfillment.create({
    data: {
      orderId,
      status: "IN_PROGRESS",
      items: {
        create: order.items.map((item, i) => {
          const match = byBarcode.get(item.productCode);
          return {
            zenotiItemId:           item.id,
            productId:              match?.id   ?? null,
            productCode:            item.productCode,
            productName:            item.productName,
            requestedRetailQty:     item.retailRaised,
            requestedConsumableQty: item.consumableRaised,
            fulfilledRetailQty:     item.retailRaised,     // pre-load with requested qty
            fulfilledConsumableQty: item.consumableRaised,
            unitPrice:              item.unitPrice ?? null,
            sortOrder:              i,
          };
        }),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(fulfillment, { status: 201 });
}
