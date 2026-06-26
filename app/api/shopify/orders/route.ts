import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET(req: NextRequest) {
	const auth = await requireRole('VIEWER');
	if (auth instanceof NextResponse) return auth;

	const { searchParams } = req.nextUrl;
	const store = searchParams.get('store') ?? undefined;
	const acknowledged = searchParams.get('acknowledged');
	const financialStatus = searchParams.get('financialStatus') ?? undefined;
	const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
	const limit = Math.min(
		100,
		Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10))
	);

	const where = {
		shopifyStatus: 'open',
		...(store ? { storeDomain: store } : {}),
		...(acknowledged === 'true' ? { isAcknowledged: true } : {}),
		...(acknowledged === 'false' ? { isAcknowledged: false } : {}),
		...(financialStatus ? { financialStatus } : {}),
	};

	const [data, total] = await Promise.all([
		prisma.shopifyOrder.findMany({
			where,
			orderBy: { createdAtShopify: 'desc' },
			skip: (page - 1) * limit,
			take: limit,
			include: {
				items: {
					select: {
						id: true,
						title: true,
						quantity: true,
						sku: true,
						price: true,
						variantTitle: true,
					},
				},
			},
		}),
		prisma.shopifyOrder.count({ where }),
	]);

	return NextResponse.json({ data, total, page, limit });
}
