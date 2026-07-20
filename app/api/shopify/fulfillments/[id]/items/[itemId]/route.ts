import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string; itemId: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { itemId } = await params;
	const body = await request.json();

	const item = await prisma.shopifyFulfillmentItem.update({
		where: { id: itemId },
		data: {
			fulfilledQty: body.fulfilledQty ?? undefined,
			isPacked: body.isPacked ?? undefined,
			notes: body.notes ?? undefined,
		},
	});

	return NextResponse.json(item);
}
