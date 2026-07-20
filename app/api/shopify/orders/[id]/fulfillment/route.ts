import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

// POST — return existing or create a new fulfillment shell
export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id: orderId } = await params;

	const order = await prisma.shopifyOrder.findUnique({
		where: { id: orderId },
		include: { items: true, fulfillment: true },
	});
	if (!order)
		return NextResponse.json({ error: 'Order not found' }, { status: 404 });
	if (order.fulfillment) {
		return NextResponse.json(order.fulfillment);
	}

	// Match Shopify SKUs to BFS products
	const skus = order.items.map((i) => i.sku).filter(Boolean) as string[];
	const products =
		skus.length > 0
			? await prisma.product.findMany({
					where: { sku: { in: skus } },
					select: { id: true, sku: true },
				})
			: [];
	const bySku = new Map(products.map((p) => [p.sku, p]));

	// If Shopify already shows this order fulfilled, it shipped without ever
	// going through BFS packing — backfill a fully-packed, submitted record
	// instead of offering "Start Packing" for something already gone.
	const alreadyFulfilled = order.fulfillmentStatus === 'fulfilled';

	try {
		const fulfillment = await prisma.shopifyFulfillment.create({
			data: {
				orderId,
				status: alreadyFulfilled ? 'SUBMITTED' : 'IN_PROGRESS',
				submittedAt: alreadyFulfilled ? new Date() : undefined,
				submittedBy: alreadyFulfilled
					? 'Synced from Shopify'
					: undefined,
				items: {
					create: order.items.map((item, i) => {
						const match = item.sku
							? bySku.get(item.sku)
							: undefined;
						return {
							shopifyLineItemId: item.shopifyLineItemId,
							productId: match?.id ?? null,
							sku: item.sku,
							title: item.title,
							variantTitle: item.variantTitle,
							requestedQty: item.quantity,
							fulfilledQty: item.quantity, // pre-load with requested qty
							isPacked: alreadyFulfilled,
							unitPrice: item.price,
							totalDiscount: item.totalDiscount,
							sortOrder: i,
						};
					}),
				},
			},
			include: { items: true },
		});

		return NextResponse.json(fulfillment, { status: 201 });
	} catch (err: unknown) {
		// Unique constraint on orderId — a concurrent request already created it
		if (
			err &&
			typeof err === 'object' &&
			'code' in err &&
			err.code === 'P2002'
		) {
			const existing = await prisma.shopifyFulfillment.findUnique({
				where: { orderId },
				include: { items: true },
			});
			if (existing) return NextResponse.json(existing);
		}
		throw err;
	}
}
