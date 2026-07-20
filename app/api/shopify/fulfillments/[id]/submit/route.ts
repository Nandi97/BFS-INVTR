import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;

	const fulfillment = await prisma.shopifyFulfillment.findUnique({
		where: { id },
	});

	if (!fulfillment)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	if (
		fulfillment.status === 'SUBMITTED' ||
		fulfillment.status === 'INVOICED'
	) {
		return NextResponse.json(
			{ error: 'Already submitted' },
			{ status: 400 }
		);
	}

	const updated = await prisma.shopifyFulfillment.update({
		where: { id },
		data: {
			status: 'SUBMITTED',
			submittedAt: new Date(),
			submittedBy: auth.user.email,
		},
	});

	return NextResponse.json({ ok: true, fulfillment: updated });
}
