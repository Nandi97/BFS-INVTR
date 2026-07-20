import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import {
	getConnectedStores,
	getShopifyStores,
	fetchShopifyProducts,
	fetchShopifyLocations,
	setInventoryLevel,
	updateShopifyProductClassification,
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
			product: {
				select: {
					sku: true,
					barcode: true,
					brand: { select: { name: true } },
					category: { select: { name: true } },
				},
			},
		},
	});

	const qtyBySku = new Map<string, number>();
	const brandBySku = new Map<string, string>();
	const categoryBySku = new Map<string, string>();
	for (const inv of bfsInventory) {
		if (inv.product.sku) qtyBySku.set(inv.product.sku, inv.quantity);
		if (inv.product.barcode)
			qtyBySku.set(inv.product.barcode, inv.quantity);
		if (inv.product.brand?.name) {
			if (inv.product.sku)
				brandBySku.set(inv.product.sku, inv.product.brand.name);
			if (inv.product.barcode)
				brandBySku.set(inv.product.barcode, inv.product.brand.name);
		}
		if (inv.product.category?.name) {
			if (inv.product.sku)
				categoryBySku.set(inv.product.sku, inv.product.category.name);
			if (inv.product.barcode)
				categoryBySku.set(
					inv.product.barcode,
					inv.product.category.name
				);
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
				};
				continue;
			}
			const locationId = locations[0].id;

			const products = await fetchShopifyProducts(store);
			let synced = 0;
			let skipped = 0;
			let classificationSynced = 0;
			const errors: string[] = [];

			for (const product of products) {
				let brandName: string | undefined;
				let categoryName: string | undefined;

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

				// Vendor/product_type are product-level in Shopify (not per variant),
				// so push once per product using whatever BFS classification its
				// variants resolved to. Only writes when BFS has a value and it
				// differs from what Shopify already has — unclassified BFS products
				// (brand/category not yet synced from QBO) leave Shopify untouched.
				const classificationUpdate: {
					vendor?: string;
					product_type?: string;
				} = {};
				if (brandName && brandName !== product.vendor) {
					classificationUpdate.vendor = brandName;
				}
				if (categoryName && categoryName !== product.product_type) {
					classificationUpdate.product_type = categoryName;
				}
				if (Object.keys(classificationUpdate).length > 0) {
					try {
						await updateShopifyProductClassification(
							store,
							product.id,
							classificationUpdate
						);
						classificationSynced++;
					} catch (err) {
						errors.push(
							`Product ${product.id} classification: ${err instanceof Error ? err.message : String(err)}`
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
			};
		} catch (err) {
			results[store.domain] = {
				synced: 0,
				skipped: 0,
				errors: [],
				error: err instanceof Error ? err.message : String(err),
				classificationSynced: 0,
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

	await prisma.syncLog.create({
		data: {
			provider: 'SHOPIFY',
			type: 'INVENTORY_SYNC',
			status: 'SUCCESS',
			message: `Pushed ${totalSynced} inventory levels + ${totalClassification} brand/category updates across ${stores.length} store(s)`,
			recordsIn: totalSynced,
			recordsOut: totalSynced,
		},
	});

	return NextResponse.json({ ok: true, stores: results });
}
