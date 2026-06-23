import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const search = searchParams.get('search') ?? '';
	const active = searchParams.get('active');
	const page = parseInt(searchParams.get('page') ?? '1', 10);
	const limit = parseInt(searchParams.get('limit') ?? '50', 10);
	const skip = (page - 1) * limit;

	const where = {
		...(active !== null ? { isActive: active === 'true' } : {}),
		...(search
			? {
					OR: [
						{
							name: {
								contains: search,
								mode: 'insensitive' as const,
							},
						},
						{
							contactName: {
								contains: search,
								mode: 'insensitive' as const,
							},
						},
						{
							email: {
								contains: search,
								mode: 'insensitive' as const,
							},
						},
					],
				}
			: {}),
	};

	const [suppliers, total] = await Promise.all([
		prisma.supplier.findMany({
			where,
			include: {
				_count: {
					select: { productSuppliers: true, purchaseOrders: true },
				},
			},
			orderBy: { name: 'asc' },
			skip,
			take: limit,
		}),
		prisma.supplier.count({ where }),
	]);

	return NextResponse.json({ data: suppliers, total, page, limit });
}

export async function POST(req: NextRequest) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	const body = await req.json();
	const { name, contactName, email, phone, address, leadTimeDays, notes } =
		body;

	if (!name?.trim()) {
		return NextResponse.json(
			{ error: 'Supplier name is required' },
			{ status: 400 }
		);
	}

	const supplier = await prisma.supplier.create({
		data: {
			name: name.trim(),
			contactName: contactName?.trim() || null,
			email: email?.trim() || null,
			phone: phone?.trim() || null,
			address: address?.trim() || null,
			leadTimeDays: leadTimeDays ? Number(leadTimeDays) : 7,
			notes: notes?.trim() || null,
		},
	});

	return NextResponse.json(supplier, { status: 201 });
}
