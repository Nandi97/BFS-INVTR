import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import {
	getShopifyStores,
	fetchShopifyProducts,
	fetchShopifyLocations,
	setInventoryLevel,
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

	const stores = getShopifyStores();
	if (stores.length === 0) {
		return NextResponse.json(
			{ error: 'No Shopify stores configured' },
			{ status: 503 }
		);
	}

	// Pre-fetch all BFS inventory (qty > 0 products with a SKU)
	const bfsInventory = await prisma.inventory.findMany({
		where: { product: { isActive: true, sku: { not: null } } },
		select: {
			quantity: true,
			product: { select: { sku: true, barcode: true } },
		},
	});

	const qtyBySku = new Map<string, number>();
	for (const inv of bfsInventory) {
		if (inv.product.sku) qtyBySku.set(inv.product.sku, inv.quantity);
		if (inv.product.barcode)
			qtyBySku.set(inv.product.barcode, inv.quantity);
	}

	const results: Record<
		string,
		{ synced: number; skipped: number; error?: string }
	> = {};

	for (const store of stores) {
		try {
			const locations = await fetchShopifyLocations(store);
			if (locations.length === 0) {
				results[store.domain] = {
					synced: 0,
					skipped: 0,
					error: 'No active locations found in Shopify',
				};
				continue;
			}
			const locationId = locations[0].id; // warehouse is always first/only

			const products = await fetchShopifyProducts(store);
			let synced = 0;
			let skipped = 0;

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
					await setInventoryLevel(
						store,
						variant.inventory_item_id,
						locationId,
						bfsQty
					);
					await delay(DELAY_MS);
					synced++;
				}
			}

			results[store.domain] = { synced, skipped };
		} catch (err) {
			results[store.domain] = {
				synced: 0,
				skipped: 0,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	const totalSynced = Object.values(results).reduce(
		(s, r) => s + r.synced,
		0
	);

	await prisma.syncLog.create({
		data: {
			provider: 'SHOPIFY',
			type: 'INVENTORY_SYNC',
			status: 'SUCCESS',
			message: `Pushed ${totalSynced} inventory levels across ${stores.length} store(s)`,
			recordsIn: totalSynced,
			recordsOut: totalSynced,
		},
	});

	return NextResponse.json({ ok: true, stores: results });
}
