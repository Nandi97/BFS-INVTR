import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const locationId = searchParams.get('locationId') ?? undefined;
	const brandId = searchParams.get('brandId') ?? undefined;

	const rows = await prisma.inventory.findMany({
		where: {
			product: { isActive: true, ...(brandId ? { brandId } : {}) },
			...(locationId ? { locationId } : {}),
		},
		include: {
			product: {
				include: {
					brand: true,
					category: true,
					productSuppliers: {
						where: { isPreferred: true },
						take: 1,
						select: {
							cost: true,
							supplier: { select: { name: true } },
						},
					},
				},
			},
			location: { select: { id: true, name: true, code: true } },
		},
		orderBy: [
			{ product: { brand: { name: 'asc' } } },
			{ product: { name: 'asc' } },
		],
	});

	const data = rows.map((inv) => {
		const preferred = inv.product.productSuppliers[0] ?? null;
		const unitCost = preferred?.cost ?? 0;
		return {
			productId: inv.productId,
			locationId: inv.locationId,
			productName: inv.product.name,
			sku: inv.product.sku ?? inv.product.barcode ?? null,
			brand: inv.product.brand?.name ?? null,
			category: inv.product.category?.name ?? null,
			location: inv.location.name,
			locationCode: inv.location.code,
			quantity: inv.quantity,
			reorderPoint: inv.reorderPoint,
			unitCost,
			totalValue: Math.round(unitCost * inv.quantity * 100) / 100,
			supplierName: preferred?.supplier?.name ?? null,
		};
	});

	const totalValue = data.reduce((s, r) => s + r.totalValue, 0);
	const totalUnits = data.reduce((s, r) => s + r.quantity, 0);

	return NextResponse.json({
		data,
		totalValue: Math.round(totalValue * 100) / 100,
		totalUnits,
	});
}
