import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { z } from 'zod';

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;
	await prisma.pendingProduct.delete({ where: { id } });
	return NextResponse.json({ ok: true });
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;
	const body = await req.json().catch(() => ({}));
	const parsed = z.object({ ignored: z.boolean() }).safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'ignored boolean required' },
			{ status: 400 }
		);
	}

	const item = await prisma.pendingProduct.update({
		where: { id },
		data: { ignored: parsed.data.ignored },
	});
	return NextResponse.json({ item });
}
