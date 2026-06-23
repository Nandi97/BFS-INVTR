import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('VIEWER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;

	const order = await prisma.zenotiOrder.findUnique({
		where: { id },
		include: {
			items: { orderBy: { productName: 'asc' } },
			fulfillment: {
				include: {
					items: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									sku: true,
									barcode: true,
								},
							},
						},
						orderBy: [{ sortOrder: 'asc' }, { productName: 'asc' }],
					},
				},
			},
		},
	});

	if (!order)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });

	// Enrich items with current stock level
	const enrichedFulfillmentItems = await Promise.all(
		(order.fulfillment?.items ?? []).map(async (item) => {
			if (!item.productId) return { ...item, stockOnHand: null };
			const inv = await prisma.inventory.findFirst({
				where: { productId: item.productId },
				select: {
					quantity: true,
					location: { select: { name: true } },
				},
			});
			return { ...item, stockOnHand: inv?.quantity ?? null };
		})
	);

	return NextResponse.json({
		...order,
		fulfillment: order.fulfillment
			? { ...order.fulfillment, items: enrichedFulfillmentItems }
			: null,
	});
}
