import { prisma } from '@/lib/prisma';

export interface StoreCatalogRule {
	mode: 'ALL' | 'BRAND_FILTERED';
	brandIds: Set<string>;
}

export async function getStoreCatalogRule(
	storeDomain: string
): Promise<StoreCatalogRule> {
	const settings = await prisma.shopifyStoreSettings.findUnique({
		where: { storeDomain },
		include: { brandRules: { select: { brandId: true } } },
	});

	if (!settings) return { mode: 'ALL', brandIds: new Set() };

	return {
		mode: settings.catalogMode,
		brandIds: new Set(settings.brandRules.map((r) => r.brandId)),
	};
}

export interface EligibleProduct {
	id: string;
	name: string;
	sku: string | null;
	barcode: string | null;
	brandId: string | null;
	brandName: string | null;
	categoryName: string | null;
	salePrice: number | null;
	description: string | null;
	imageUrl: string | null;
	stockQty: number;
}

export async function getEligibleProducts(
	storeDomain: string
): Promise<EligibleProduct[]> {
	const rule = await getStoreCatalogRule(storeDomain);

	const products = await prisma.product.findMany({
		where: {
			isActive: true,
			OR: [{ sku: { not: null } }, { barcode: { not: null } }],
			...(rule.mode === 'BRAND_FILTERED'
				? { brandId: { in: Array.from(rule.brandIds) } }
				: {}),
		},
		select: {
			id: true,
			name: true,
			sku: true,
			barcode: true,
			brandId: true,
			salePrice: true,
			description: true,
			imageUrl: true,
			brand: { select: { name: true } },
			category: { select: { name: true } },
			inventory: { select: { quantity: true } },
		},
	});

	return products.map((p) => ({
		id: p.id,
		name: p.name,
		sku: p.sku,
		barcode: p.barcode,
		brandId: p.brandId,
		brandName: p.brand?.name ?? null,
		categoryName: p.category?.name ?? null,
		salePrice: p.salePrice,
		description: p.description,
		imageUrl: p.imageUrl,
		stockQty: p.inventory.reduce((sum, i) => sum + i.quantity, 0),
	}));
}
