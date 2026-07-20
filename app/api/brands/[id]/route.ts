import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	try {
		const { id } = await params;
		const { name, leadTimeDays, isWarehoused } = await req.json();
		if (!name?.trim())
			return NextResponse.json(
				{ error: 'Name is required' },
				{ status: 400 }
			);

		const brand = await prisma.brand.update({
			where: { id },
			data: {
				name: name.trim(),
				...(leadTimeDays != null
					? {
							leadTimeDays: Math.max(
								1,
								parseInt(String(leadTimeDays), 10)
							),
						}
					: {}),
				...(typeof isWarehoused === 'boolean' ? { isWarehoused } : {}),
			},
		});
		return NextResponse.json(brand);
	} catch (err: any) {
		if (err?.code === 'P2025')
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		if (err?.code === 'P2002')
			return NextResponse.json(
				{ error: 'Brand already exists' },
				{ status: 409 }
			);
		return NextResponse.json(
			{ error: 'Failed to update brand' },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	try {
		const { id } = await params;
		const count = await prisma.product.count({ where: { brandId: id } });
		if (count > 0) {
			return NextResponse.json(
				{ error: `Cannot delete — ${count} product(s) use this brand` },
				{ status: 409 }
			);
		}
		await prisma.brand.delete({ where: { id } });
		return NextResponse.json({ success: true });
	} catch (err: any) {
		if (err?.code === 'P2025')
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		return NextResponse.json(
			{ error: 'Failed to delete brand' },
			{ status: 500 }
		);
	}
}
