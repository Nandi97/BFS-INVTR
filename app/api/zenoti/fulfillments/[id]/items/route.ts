import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

// Add walk-in item
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id: fulfillmentId } = await params;
	const body = await request.json();

	const fulfillment = await prisma.bfsFulfillment.findUnique({
		where: { id: fulfillmentId },
	});
	if (!fulfillment)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });

	// Optionally match a BFS product by barcode
	let productId: string | null = null;
	if (body.productCode) {
		const p = await prisma.product.findFirst({
			where: {
				OR: [{ barcode: body.productCode }, { sku: body.productCode }],
			},
			select: { id: true },
		});
		productId = p?.id ?? null;
	}

	const item = await prisma.bfsFulfillmentItem.create({
		data: {
			fulfillmentId,
			productId,
			productCode: body.productCode ?? null,
			productName: body.productName ?? 'Walk-in item',
			requestedRetailQty: body.requestedRetailQty ?? 0,
			requestedConsumableQty: body.requestedConsumableQty ?? 0,
			fulfilledRetailQty:
				body.fulfilledRetailQty ?? body.requestedRetailQty ?? 0,
			fulfilledConsumableQty:
				body.fulfilledConsumableQty ?? body.requestedConsumableQty ?? 0,
			unitPrice: body.unitPrice ?? null,
			isWalkIn: true,
			isPacked: false,
		},
		include: {
			product: {
				select: { id: true, name: true, sku: true, barcode: true },
			},
		},
	});

	return NextResponse.json(item, { status: 201 });
}
