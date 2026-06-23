import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;
		const product = await prisma.product.findUnique({
			where: { id },
			include: {
				brand: true,
				category: true,
				inventory: {
					include: {
						location: {
							select: { id: true, name: true, code: true },
						},
					},
				},
				productSuppliers: {
					include: { supplier: { select: { id: true, name: true } } },
				},
				salesRecords: {
					select: {
						year: true,
						month: true,
						quantity: true,
						revenue: true,
					},
					orderBy: [{ year: 'asc' }, { month: 'asc' }],
				},
				stockMovements: {
					select: {
						createdAt: true,
						quantity: true,
						type: true,
						balanceAfter: true,
						notes: true,
					},
					orderBy: { createdAt: 'desc' },
					take: 60,
				},
			},
		});

		if (!product)
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		return NextResponse.json(product);
	} catch (err) {
		return NextResponse.json(
			{ error: 'Failed to fetch product' },
			{ status: 500 }
		);
	}
}

export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	try {
		const { id } = await params;
		const body = await req.json();
		const {
			name,
			sku,
			barcode,
			brandId,
			categoryId,
			productType,
			unit,
			description,
			imageUrl,
			isActive,
			targetStockMonths,
		} = body;

		if (name !== undefined && !name?.trim()) {
			return NextResponse.json(
				{ error: 'Name cannot be empty' },
				{ status: 400 }
			);
		}
		if (
			targetStockMonths !== undefined &&
			(typeof targetStockMonths !== 'number' ||
				targetStockMonths < 1 ||
				targetStockMonths > 36)
		) {
			return NextResponse.json(
				{ error: 'targetStockMonths must be between 1 and 36' },
				{ status: 400 }
			);
		}

		const product = await prisma.product.update({
			where: { id },
			data: {
				...(name !== undefined && { name: name.trim() }),
				...(sku !== undefined && { sku: sku?.trim() || null }),
				...(barcode !== undefined && {
					barcode: barcode?.trim() || null,
				}),
				...(brandId !== undefined && { brandId: brandId || null }),
				...(categoryId !== undefined && {
					categoryId: categoryId || null,
				}),
				...(productType !== undefined && { productType }),
				...(unit !== undefined && { unit: unit?.trim() || 'each' }),
				...(description !== undefined && {
					description: description?.trim() || null,
				}),
				...(imageUrl !== undefined && {
					imageUrl: imageUrl?.trim() || null,
				}),
				...(isActive !== undefined && { isActive }),
				...(targetStockMonths !== undefined && { targetStockMonths }),
			},
			include: {
				brand: { select: { id: true, name: true } },
				category: { select: { id: true, name: true } },
			},
		});

		return NextResponse.json(product);
	} catch (err: any) {
		if (err?.code === 'P2025')
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		if (err?.code === 'P2002') {
			const field = err.meta?.target?.[0] ?? 'field';
			return NextResponse.json(
				{ error: `${field} already exists` },
				{ status: 409 }
			);
		}
		return NextResponse.json(
			{ error: 'Failed to update product' },
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
		// Soft delete
		await prisma.product.update({
			where: { id },
			data: { isActive: false },
		});
		return NextResponse.json({ success: true });
	} catch (err: any) {
		if (err?.code === 'P2025')
			return NextResponse.json({ error: 'Not found' }, { status: 404 });
		return NextResponse.json(
			{ error: 'Failed to archive product' },
			{ status: 500 }
		);
	}
}
