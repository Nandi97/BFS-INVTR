import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;

	const supplier = await prisma.supplier.findUnique({
		where: { id },
		include: {
			productSuppliers: {
				include: {
					product: { include: { brand: true } },
				},
				orderBy: { product: { name: 'asc' } },
			},
			purchaseOrders: {
				orderBy: { createdAt: 'desc' },
				take: 10,
				include: { _count: { select: { items: true } } },
			},
			_count: {
				select: { productSuppliers: true, purchaseOrders: true },
			},
		},
	});

	if (!supplier)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	return NextResponse.json(supplier);
}

export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	const { id } = await params;
	const body = await req.json();
	const {
		name,
		contactName,
		email,
		phone,
		address,
		leadTimeDays,
		notes,
		isActive,
	} = body;

	const supplier = await prisma.supplier.update({
		where: { id },
		data: {
			...(name !== undefined ? { name: name.trim() } : {}),
			...(contactName !== undefined
				? { contactName: contactName?.trim() || null }
				: {}),
			...(email !== undefined ? { email: email?.trim() || null } : {}),
			...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
			...(address !== undefined
				? { address: address?.trim() || null }
				: {}),
			...(leadTimeDays !== undefined
				? { leadTimeDays: Number(leadTimeDays) }
				: {}),
			...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
			...(isActive !== undefined ? { isActive } : {}),
		},
		include: {
			_count: {
				select: { productSuppliers: true, purchaseOrders: true },
			},
		},
	});

	return NextResponse.json(supplier);
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	const { id } = await params;

	const poCount = await prisma.purchaseOrder.count({
		where: { supplierId: id },
	});
	if (poCount > 0) {
		return NextResponse.json(
			{ error: 'Supplier has purchase orders. Deactivate it instead.' },
			{ status: 409 }
		);
	}

	await prisma.supplier.delete({ where: { id } });
	return new NextResponse(null, { status: 204 });
}
