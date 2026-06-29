import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import {
	getConnectedStores,
	getShopifyStores,
	fetchShopifyProducts,
	fetchShopifyLocations,
	setInventoryLevel,
	setVariantPrice,
} from '@/lib/shopify';

const DELAY_MS = 600; // stay comfortably under Shopify's 2 req/s rate limit

function delay(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const isCron =
		process.env.CRON_SECRET &&
		authHeader === `Bearer ${process.env.CRON_SECRET}`;

	if (!isCron) {
		const auth = await requireRole('MANAGER');
		if (auth instanceof NextResponse) return auth;
	}

	const body = await req.json().catch(() => ({}));
	const shopFilter: string | undefined = body?.shop;

	let stores = (await getConnectedStores()).concat(getShopifyStores());
	if (shopFilter) stores = stores.filter((s) => s.domain === shopFilter);
	if (stores.length === 0) {
		return NextResponse.json(
			{
				error: shopFilter
					? `Store ${shopFilter} not found. Check it is connected in Integrations.`
					: 'No Shopify stores connected. Go to Integrations to connect a store.',
			},
			{ status: 503 }
		);
	}

	// Pre-fetch all BFS inventory (active products with a SKU)
	const bfsInventory = await prisma.inventory.findMany({
		where: { product: { isActive: true, sku: { not: null } } },
		select: {
			quantity: true,
			product: { select: { sku: true, barcode: true, salePrice: true } },
		},
	});

	const qtyBySku = new Map<string, number>();
	const priceBySku = new Map<string, number>();
	for (const inv of bfsInventory) {
		if (inv.product.sku) {
			qtyBySku.set(inv.product.sku, inv.quantity);
			if (inv.product.salePrice != null)
				priceBySku.set(inv.product.sku, inv.product.salePrice);
		}
		if (inv.product.barcode) {
			qtyBySku.set(inv.product.barcode, inv.quantity);
			if (inv.product.salePrice != null)
				priceBySku.set(inv.product.barcode, inv.product.salePrice);
		}
	}

	const results: Record<
		string,
		{
			synced: number;
			skipped: number;
			pricesSynced: number;
			errors: string[];
			error?: string;
		}
	> = {};

	for (const store of stores) {
		try {
			const locations = await fetchShopifyLocations(store);
			if (locations.length === 0) {
				results[store.domain] = {
					synced: 0,
					skipped: 0,
					pricesSynced: 0,
					errors: [],
					error: 'No active locations found in Shopify',
				};
				continue;
			}
			const locationId = locations[0].id;

			const products = await fetchShopifyProducts(store);
			let synced = 0;
			let skipped = 0;
			let pricesSynced = 0;
			const errors: string[] = [];

			for (const product of products) {
				for (const variant of product.variants) {
					if (!variant.sku) {
						skipped++;
						continue;
					}
					const bfsQty =
						qtyBySku.get(variant.sku) ??
						qtyBySku.get(variant.sku.toLowerCase());
					if (bfsQty === undefined) {
						skipped++;
						continue;
					}
					try {
						await setInventoryLevel(
							store,
							variant.inventory_item_id,
							locationId,
							bfsQty
						);
						synced++;
					} catch (variantErr) {
						errors.push(
							`SKU ${variant.sku}: ${variantErr instanceof Error ? variantErr.message : String(variantErr)}`
						);
					}
					await delay(DELAY_MS);

					// Push sale price if BFS has one and it differs from Shopify
					const bfsPrice =
						priceBySku.get(variant.sku) ??
						priceBySku.get(variant.sku.toLowerCase());
					if (
						bfsPrice != null &&
						Math.abs(bfsPrice - parseFloat(variant.price)) > 0.001
					) {
						try {
							await setVariantPrice(store, variant.id, bfsPrice);
							pricesSynced++;
						} catch (priceErr) {
							errors.push(
								`SKU ${variant.sku} price: ${priceErr instanceof Error ? priceErr.message : String(priceErr)}`
							);
						}
						await delay(DELAY_MS);
					}
				}
			}

			results[store.domain] = { synced, skipped, pricesSynced, errors };
		} catch (err) {
			results[store.domain] = {
				synced: 0,
				skipped: 0,
				pricesSynced: 0,
				errors: [],
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	const totalSynced = Object.values(results).reduce(
		(s, r) => s + r.synced,
		0
	);
	const totalPrices = Object.values(results).reduce(
		(s, r) => s + r.pricesSynced,
		0
	);

	await prisma.syncLog.create({
		data: {
			provider: 'SHOPIFY',
			type: 'INVENTORY_SYNC',
			status: 'SUCCESS',
			message: `Pushed ${totalSynced} inventory levels and ${totalPrices} prices across ${stores.length} store(s)`,
			recordsIn: totalSynced,
			recordsOut: totalSynced,
		},
	});

	return NextResponse.json({ ok: true, stores: results });
}
