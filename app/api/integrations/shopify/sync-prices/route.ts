import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import {
	getConnectedStores,
	getShopifyStores,
	fetchShopifyProducts,
	setVariantPrice,
} from '@/lib/shopify';

const DELAY_MS = 600;

function delay(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const body = await req.json().catch(() => ({}));
	const shopFilter: string | undefined = body?.shop;

	let stores = (await getConnectedStores()).concat(getShopifyStores());
	if (shopFilter) stores = stores.filter((s) => s.domain === shopFilter);
	if (stores.length === 0) {
		return NextResponse.json(
			{
				error: shopFilter
					? `Store ${shopFilter} not found.`
					: 'No Shopify stores connected.',
			},
			{ status: 503 }
		);
	}

	// Build price map from BFS products that have a sale price
	const products = await prisma.product.findMany({
		where: { isActive: true, salePrice: { not: null } },
		select: { sku: true, barcode: true, salePrice: true },
	});

	const priceBySku = new Map<string, number>();
	for (const p of products) {
		if (p.sku && p.salePrice != null) priceBySku.set(p.sku, p.salePrice);
		if (p.barcode && p.salePrice != null)
			priceBySku.set(p.barcode, p.salePrice);
	}

	const results: Record<
		string,
		{
			pricesSynced: number;
			skipped: number;
			errors: string[];
			error?: string;
		}
	> = {};

	for (const store of stores) {
		try {
			const shopifyProducts = await fetchShopifyProducts(store);
			let pricesSynced = 0;
			let skipped = 0;
			const errors: string[] = [];

			for (const product of shopifyProducts) {
				for (const variant of product.variants) {
					if (!variant.sku) {
						skipped++;
						continue;
					}
					const bfsPrice =
						priceBySku.get(variant.sku) ??
						priceBySku.get(variant.sku.toLowerCase());
					if (bfsPrice == null) {
						skipped++;
						continue;
					}
					if (
						Math.abs(bfsPrice - parseFloat(variant.price)) <= 0.001
					) {
						skipped++;
						continue;
					}
					try {
						await setVariantPrice(store, variant.id, bfsPrice);
						pricesSynced++;
					} catch (err) {
						errors.push(
							`SKU ${variant.sku}: ${err instanceof Error ? err.message : String(err)}`
						);
					}
					await delay(DELAY_MS);
				}
			}

			results[store.domain] = { pricesSynced, skipped, errors };
		} catch (err) {
			results[store.domain] = {
				pricesSynced: 0,
				skipped: 0,
				errors: [],
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	const totalPrices = Object.values(results).reduce(
		(s, r) => s + r.pricesSynced,
		0
	);

	await prisma.syncLog.create({
		data: {
			provider: 'SHOPIFY',
			type: 'INVENTORY_SYNC',
			status: 'SUCCESS',
			message: `Pushed ${totalPrices} prices across ${stores.length} store(s)`,
			recordsIn: totalPrices,
			recordsOut: totalPrices,
		},
	});

	return NextResponse.json({ ok: true, stores: results });
}
