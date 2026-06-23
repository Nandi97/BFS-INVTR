import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET() {
	try {
		const brands = await prisma.brand.findMany({
			orderBy: { name: 'asc' },
			include: { _count: { select: { products: true } } },
		});
		return NextResponse.json(brands);
	} catch {
		return NextResponse.json(
			{ error: 'Failed to fetch brands' },
			{ status: 500 }
		);
	}
}

export async function POST(req: NextRequest) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	try {
		const { name } = await req.json();
		if (!name?.trim())
			return NextResponse.json(
				{ error: 'Name is required' },
				{ status: 400 }
			);

		const brand = await prisma.brand.create({
			data: { name: name.trim() },
		});
		return NextResponse.json(brand, { status: 201 });
	} catch (err: any) {
		if (err?.code === 'P2002')
			return NextResponse.json(
				{ error: 'Brand already exists' },
				{ status: 409 }
			);
		return NextResponse.json(
			{ error: 'Failed to create brand' },
			{ status: 500 }
		);
	}
}
