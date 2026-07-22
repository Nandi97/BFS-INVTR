import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { getStoreByDomain, fetchShopifyProducts } from '@/lib/shopify';
import { getEligibleProducts } from '@/lib/shopify-catalog';

export async function GET(req: NextRequest) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const shop = req.nextUrl.searchParams.get('shop');
	if (!shop) {
		return NextResponse.json({ error: 'shop required' }, { status: 400 });
	}

	const store = await getStoreByDomain(shop);
	if (!store) {
		return NextResponse.json(
			{
				error: `Store ${shop} not found. Check it is connected in Integrations.`,
			},
			{ status: 503 }
		);
	}

	const eligible = await getEligibleProducts(shop);
	const shopifyProducts = await fetchShopifyProducts(store);

	const liveBySku = new Map<
		string,
		{ productId: number; variantId: number }
	>();
	for (const p of shopifyProducts) {
		for (const v of p.variants) {
			if (v.sku)
				liveBySku.set(v.sku.toLowerCase(), {
					productId: p.id,
					variantId: v.id,
				});
		}
	}

	const alreadyMapped = new Set(
		(
			await prisma.shopifyProductMapping.findMany({
				where: {
					storeDomain: shop,
					productId: { in: eligible.map((p) => p.id) },
				},
				select: { productId: true },
			})
		).map((m) => m.productId)
	);

	let reconciled = 0;
	const result: Array<{
		productId: string;
		name: string;
		sku: string | null;
		barcode: string | null;
		brand: string | null;
		category: string | null;
		salePrice: number | null;
		description: string | null;
		imageUrl: string | null;
		stockQty: number;
		needsPrice: boolean;
	}> = [];

	for (const product of eligible) {
		if (alreadyMapped.has(product.id)) continue;

		const key = (product.sku ?? product.barcode ?? '').toLowerCase();
		const live = key ? liveBySku.get(key) : undefined;

		if (live) {
			// Already listed on Shopify from before this feature existed —
			// backfill the mapping row silently, not a creation candidate.
			await prisma.shopifyProductMapping.upsert({
				where: {
					productId_storeDomain: {
						productId: product.id,
						storeDomain: shop,
					},
				},
				create: {
					productId: product.id,
					storeDomain: shop,
					shopifyProductId: String(live.productId),
					shopifyVariantId: String(live.variantId),
				},
				update: {},
			});
			reconciled++;
			continue;
		}

		result.push({
			productId: product.id,
			name: product.name,
			sku: product.sku,
			barcode: product.barcode,
			brand: product.brandName,
			category: product.categoryName,
			salePrice: product.salePrice,
			description: product.description,
			imageUrl: product.imageUrl,
			stockQty: product.stockQty,
			needsPrice: product.salePrice == null,
		});
	}

	return NextResponse.json({ candidates: result, reconciled });
}
