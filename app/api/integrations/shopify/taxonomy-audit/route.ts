import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { getStoreByDomain, fetchShopifyProducts } from '@/lib/shopify';

interface TaxonomyBucket {
	exactMatches: { name: string; productCount: number }[];
	shopifyOnly: { name: string; productCount: number }[];
	bfsOnly: string[];
}

function buildBucket(
	liveCounts: Map<string, number>,
	bfsNames: string[]
): TaxonomyBucket {
	const bfsByLower = new Map(bfsNames.map((n) => [n.toLowerCase(), n]));
	const matchedBfsLower = new Set<string>();

	const exactMatches: TaxonomyBucket['exactMatches'] = [];
	const shopifyOnly: TaxonomyBucket['shopifyOnly'] = [];

	for (const [nameLower, productCount] of liveCounts) {
		const bfsName = bfsByLower.get(nameLower);
		if (bfsName) {
			matchedBfsLower.add(nameLower);
			exactMatches.push({ name: bfsName, productCount });
		} else {
			shopifyOnly.push({ name: nameLower, productCount });
		}
	}

	const bfsOnly = bfsNames.filter(
		(n) => !matchedBfsLower.has(n.toLowerCase())
	);

	exactMatches.sort((a, b) => b.productCount - a.productCount);
	shopifyOnly.sort((a, b) => b.productCount - a.productCount);
	bfsOnly.sort();

	return { exactMatches, shopifyOnly, bfsOnly };
}

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

	const [products, brands, categories] = await Promise.all([
		fetchShopifyProducts(store),
		prisma.brand.findMany({ select: { name: true } }),
		prisma.category.findMany({ select: { name: true } }),
	]);

	const vendorCounts = new Map<string, number>();
	const typeCounts = new Map<string, number>();
	for (const p of products) {
		if (p.vendor?.trim()) {
			const key = p.vendor.trim().toLowerCase();
			vendorCounts.set(key, (vendorCounts.get(key) ?? 0) + 1);
		}
		if (p.product_type?.trim()) {
			const key = p.product_type.trim().toLowerCase();
			typeCounts.set(key, (typeCounts.get(key) ?? 0) + 1);
		}
	}

	return NextResponse.json({
		shop,
		productCount: products.length,
		vendors: buildBucket(
			vendorCounts,
			brands.map((b) => b.name)
		),
		categories: buildBucket(
			typeCounts,
			categories.map((c) => c.name)
		),
	});
}
