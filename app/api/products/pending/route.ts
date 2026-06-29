import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
	const showIgnored =
		new URL(req.url).searchParams.get('showIgnored') === 'true';

	const items = await prisma.pendingProduct.findMany({
		where: showIgnored ? { ignored: true } : { ignored: false },
		orderBy: [{ qtyOnHand: 'desc' }, { lastSeenAt: 'desc' }],
	});

	const ignoredCount = showIgnored
		? items.length
		: await prisma.pendingProduct.count({ where: { ignored: true } });

	return NextResponse.json({
		data: items,
		total: items.length,
		ignoredCount,
	});
}
