import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET() {
	const auth = await requireRole('VIEWER');
	if (auth instanceof NextResponse) return auth;

	const orders = await prisma.zenotiOrder.findMany({
		where: { zenotiStatus: { in: ['RAISED', 'UPDATED'] } },
		include: {
			items: { orderBy: { productName: 'asc' } },
			fulfillment: { select: { status: true, submittedAt: true } },
		},
		orderBy: [{ raisedAt: 'desc' }, { createdAt: 'desc' }],
	});

	return NextResponse.json(orders);
}
