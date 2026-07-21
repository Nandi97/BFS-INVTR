import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import {
	getConnectedStores,
	getShopifyStores,
	fetchShopifyProducts,
	fetchShopifyLocations,
	setInventoryLevel,
	updateShopifyProduct,
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

	// Pre-fetch all BFS products with a SKU or barcode — both active and
	// inactive, since inactive products still need to be matched so their
	// Shopify counterpart can be flipped to Draft (see isActiveBySku below).
	const bfsProducts = await prisma.product.findMany({
		where: { OR: [{ sku: { not: null } }, { barcode: { not: null } }] },
		select: {
			sku: true,
			barcode: true,
			isActive: true,
			brand: { select: { name: true } },
			category: { select: { name: true } },
			inventory: { select: { quantity: true } },
		},
	});

	const qtyBySku = new Map<string, number>();
	const brandBySku = new Map<string, string>();
	const categoryBySku = new Map<string, string>();
	const isActiveBySku = new Map<string, boolean>();
	for (const p of bfsProducts) {
		const keys = [p.sku, p.barcode].filter((k): k is string => !!k);
		for (const key of keys) {
			isActiveBySku.set(key, p.isActive);
			// Stock/brand/category only ever push for active products — an
			// inactive product's stale quantity shouldn't be pushed, only its
			// active-status flip.
			if (!p.isActive) continue;
			const qty = p.inventory.reduce((sum, i) => sum + i.quantity, 0);
			qtyBySku.set(key, qty);
			if (p.brand?.name) brandBySku.set(key, p.brand.name);
			if (p.category?.name) categoryBySku.set(key, p.category.name);
		}
	}

	const results: Record<
		string,
		{
			synced: number;
			skipped: number;
			errors: string[];
			error?: string;
			classificationSynced: number;
			statusSynced: number;
		}
	> = {};

	for (const store of stores) {
		try {
			const locations = await fetchShopifyLocations(store);
			if (locations.length === 0) {
				results[store.domain] = {
					synced: 0,
					skipped: 0,
					errors: [],
					error: 'No active locations found in Shopify',
					classificationSynced: 0,
					statusSynced: 0,
				};
				continue;
			}
			const locationId = locations[0].id;

			const products = await fetchShopifyProducts(store);
			let synced = 0;
			let skipped = 0;
			let classificationSynced = 0;
			let statusSynced = 0;
			const errors: string[] = [];

			for (const product of products) {
				let brandName: string | undefined;
				let categoryName: string | undefined;
				// Status uses "any variant active wins" — not "first match wins"
				// like brand/category — because a Shopify product can bundle
				// several BFS products as variants (e.g. different sizes). If
				// even one is still active/sellable, the whole listing should
				// stay visible rather than going Draft because an unrelated
				// variant happened to be inactive and came first in the array.
				let anyMatched = false;
				let anyActiveMatch = false;

				for (const variant of product.variants) {
					if (!variant.sku) {
						skipped++;
						continue;
					}
					const isActive =
						isActiveBySku.get(variant.sku) ??
						isActiveBySku.get(variant.sku.toLowerCase());
					if (isActive === undefined) {
						skipped++;
						continue;
					}
					anyMatched = true;
					if (isActive) anyActiveMatch = true;

					if (!isActive) {
						// Inactive BFS products don't get stock pushed — only
						// the active-status flip (below) applies to them.
						continue;
					}

					const bfsQty =
						qtyBySku.get(variant.sku) ??
						qtyBySku.get(variant.sku.toLowerCase());
					if (bfsQty === undefined) {
						skipped++;
						continue;
					}
					if (!brandName) {
						brandName =
							brandBySku.get(variant.sku) ??
							brandBySku.get(variant.sku.toLowerCase());
					}
					if (!categoryName) {
						categoryName =
							categoryBySku.get(variant.sku) ??
							categoryBySku.get(variant.sku.toLowerCase());
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
				}

				// Vendor/product_type/status are all product-level in Shopify
				// (not per variant), so push once per product using whatever BFS
				// data its variants resolved to. Only writes fields that are both
				// present in BFS and different from what Shopify already has —
				// unclassified BFS products (brand/category not yet synced from
				// QBO) leave Shopify's existing vendor/product_type untouched.
				const productUpdate: {
					vendor?: string;
					product_type?: string;
					status?: 'active' | 'draft';
				} = {};
				if (brandName && brandName !== product.vendor) {
					productUpdate.vendor = brandName;
				}
				if (categoryName && categoryName !== product.product_type) {
					productUpdate.product_type = categoryName;
				}
				if (anyMatched) {
					const desiredStatus = anyActiveMatch ? 'active' : 'draft';
					if (desiredStatus !== product.status) {
						productUpdate.status = desiredStatus;
					}
				}
				if (Object.keys(productUpdate).length > 0) {
					try {
						await updateShopifyProduct(
							store,
							product.id,
							productUpdate
						);
						if (productUpdate.status) statusSynced++;
						if (productUpdate.vendor || productUpdate.product_type)
							classificationSynced++;
					} catch (err) {
						errors.push(
							`Product ${product.id} update: ${err instanceof Error ? err.message : String(err)}`
						);
					}
					await delay(DELAY_MS);
				}
			}

			results[store.domain] = {
				synced,
				skipped,
				errors,
				classificationSynced,
				statusSynced,
			};
		} catch (err) {
			results[store.domain] = {
				synced: 0,
				skipped: 0,
				errors: [],
				error: err instanceof Error ? err.message : String(err),
				classificationSynced: 0,
				statusSynced: 0,
			};
		}
	}

	const totalSynced = Object.values(results).reduce(
		(s, r) => s + r.synced,
		0
	);
	const totalClassification = Object.values(results).reduce(
		(s, r) => s + r.classificationSynced,
		0
	);
	const totalStatus = Object.values(results).reduce(
		(s, r) => s + r.statusSynced,
		0
	);

	await prisma.syncLog.create({
		data: {
			provider: 'SHOPIFY',
			type: 'INVENTORY_SYNC',
			status: 'SUCCESS',
			message: `Pushed ${totalSynced} inventory levels + ${totalClassification} brand/category updates + ${totalStatus} status changes across ${stores.length} store(s)`,
			recordsIn: totalSynced,
			recordsOut: totalSynced,
		},
	});

	return NextResponse.json({ ok: true, stores: results });
}
