import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;
	const { reviewNote } = await req.json();

	const movement = await prisma.stockMovement.findUnique({ where: { id } });
	if (!movement) {
		return NextResponse.json(
			{ error: 'Movement not found' },
			{ status: 404 }
		);
	}

	const updated = await prisma.stockMovement.update({
		where: { id },
		data: {
			isReviewed: true,
			reviewNote: reviewNote ?? null,
			reviewedAt: new Date(),
		},
	});

	return NextResponse.json(updated);
}
