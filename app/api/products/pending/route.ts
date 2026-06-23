import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
	const items = await prisma.pendingProduct.findMany({
		orderBy: [{ qtyOnHand: 'desc' }, { lastSeenAt: 'desc' }],
	});
	return NextResponse.json({ data: items, total: items.length });
}
