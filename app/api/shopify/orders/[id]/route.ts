import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('VIEWER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;

	const order = await prisma.shopifyOrder.findUnique({
		where: { id },
		include: { items: true },
	});

	if (!order) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	// Attach BFS stock for each line item matched by SKU
	const skus = order.items.map((i) => i.sku).filter(Boolean) as string[];
	const inventory =
		skus.length > 0
			? await prisma.inventory.findMany({
					where: { product: { sku: { in: skus }, isActive: true } },
					select: {
						quantity: true,
						product: {
							select: { id: true, name: true, sku: true },
						},
					},
				})
			: [];

	const stockBySku = new Map(inventory.map((inv) => [inv.product.sku!, inv]));

	const itemsWithStock = order.items.map((item) => ({
		...item,
		bfsMatch: item.sku ? (stockBySku.get(item.sku) ?? null) : null,
	}));

	return NextResponse.json({ ...order, items: itemsWithStock });
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;
	const body = await req.json();

	const order = await prisma.shopifyOrder.update({
		where: { id },
		data: {
			...(typeof body.isAcknowledged === 'boolean' && {
				isAcknowledged: body.isAcknowledged,
			}),
		},
	});

	return NextResponse.json(order);
}
