import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface DispatchRow {
	productId: string;
	productName: string;
	brandName: string | null;
	unitCost: number | null;
	total: number;
	byStore: Record<string, number>;
}

export interface DispatchByStoreResult {
	stores: string[];
	products: DispatchRow[];
	dateFrom: string | null;
	dateTo: string | null;
}

function parseStore(notes: string | null): string {
	if (!notes) return 'Unknown';
	const m = notes.match(/(?:dispatched to|invoiced to)\s+(.+)$/i);
	return m ? m[1].trim() : 'Unknown';
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const dateFrom = searchParams.get('dateFrom');
	const dateTo = searchParams.get('dateTo');
	const brandId = searchParams.get('brandId');

	const movements = await prisma.stockMovement.findMany({
		where: {
			type: 'ADJUSTMENT_OUT',
			...(dateFrom || dateTo
				? {
						createdAt: {
							...(dateFrom ? { gte: new Date(dateFrom) } : {}),
							...(dateTo
								? { lte: new Date(dateTo + 'T23:59:59Z') }
								: {}),
						},
					}
				: {}),
			...(brandId ? { product: { brandId } } : {}),
		},
		select: {
			productId: true,
			quantity: true,
			notes: true,
			product: {
				select: {
					name: true,
					brandId: true,
					brand: { select: { name: true } },
					productSuppliers: {
						where: { isPreferred: true },
						select: { cost: true },
						take: 1,
					},
				},
			},
		},
		orderBy: { createdAt: 'asc' },
	});

	// Pivot: productId → store → qty
	const productMap = new Map<
		string,
		{
			productName: string;
			brandName: string | null;
			unitCost: number | null;
			byStore: Map<string, number>;
		}
	>();

	const storeSet = new Set<string>();

	for (const m of movements) {
		const store = parseStore(m.notes);
		storeSet.add(store);

		if (!productMap.has(m.productId)) {
			const cost = m.product.productSuppliers[0]?.cost ?? null;
			productMap.set(m.productId, {
				productName: m.product.name,
				brandName: m.product.brand?.name ?? null,
				unitCost: cost,
				byStore: new Map(),
			});
		}

		const entry = productMap.get(m.productId)!;
		entry.byStore.set(store, (entry.byStore.get(store) ?? 0) + m.quantity);
	}

	// Sort stores alphabetically, Unknown last
	const stores = [...storeSet].sort((a, b) => {
		if (a === 'Unknown') return 1;
		if (b === 'Unknown') return -1;
		return a.localeCompare(b);
	});

	const products: DispatchRow[] = [...productMap.entries()]
		.map(([productId, entry]) => {
			const byStore: Record<string, number> = {};
			let total = 0;
			for (const store of stores) {
				const qty = entry.byStore.get(store) ?? 0;
				byStore[store] = qty;
				total += qty;
			}
			return {
				productId,
				productName: entry.productName,
				brandName: entry.brandName,
				unitCost: entry.unitCost,
				total,
				byStore,
			};
		})
		.sort((a, b) => b.total - a.total);

	return NextResponse.json({ stores, products, dateFrom, dateTo });
}
