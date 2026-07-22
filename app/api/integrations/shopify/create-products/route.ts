import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { getStoreByDomain, createShopifyProduct } from '@/lib/shopify';
import { getEligibleProducts } from '@/lib/shopify-catalog';

interface CreateItemInput {
	productId: string;
	price?: number;
	title?: string;
	description?: string;
	imageUrl?: string;
}

export async function POST(req: NextRequest) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const body = await req.json().catch(() => ({}));
	const shop: string | undefined = body?.shop;
	const items: CreateItemInput[] = Array.isArray(body?.items)
		? body.items
		: [];

	if (!shop) {
		return NextResponse.json({ error: 'shop required' }, { status: 400 });
	}
	if (items.length === 0) {
		return NextResponse.json({ error: 'items required' }, { status: 400 });
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

	// Re-resolve eligibility fresh — store rules may have changed since the
	// review queue was opened.
	const eligible = await getEligibleProducts(shop);
	const eligibleById = new Map(eligible.map((p) => [p.id, p]));

	const alreadyMapped = new Set(
		(
			await prisma.shopifyProductMapping.findMany({
				where: {
					storeDomain: shop,
					productId: { in: items.map((i) => i.productId) },
				},
				select: { productId: true },
			})
		).map((m) => m.productId)
	);

	let created = 0;
	const errors: string[] = [];

	for (const item of items) {
		const product = eligibleById.get(item.productId);
		if (!product) {
			errors.push(
				`${item.productId}: no longer eligible for ${shop} (removed, deactivated, or excluded by store rules)`
			);
			continue;
		}
		if (alreadyMapped.has(item.productId)) {
			errors.push(`${product.name}: already linked to ${shop}`);
			continue;
		}

		const price = item.price ?? product.salePrice;
		if (price == null || price <= 0) {
			errors.push(
				`${product.name}: a price is required to create this product`
			);
			continue;
		}

		try {
			const created_ = await createShopifyProduct(store, {
				title: item.title ?? product.name,
				vendor: product.brandName ?? undefined,
				product_type: product.categoryName ?? undefined,
				status: 'active',
				sku: product.sku ?? undefined,
				barcode: product.barcode ?? undefined,
				price,
				inventory_quantity: product.stockQty,
				imageUrl: item.imageUrl ?? product.imageUrl ?? undefined,
			});

			const variant = created_.variants[0];
			await prisma.shopifyProductMapping.create({
				data: {
					productId: product.id,
					storeDomain: shop,
					shopifyProductId: String(created_.id),
					shopifyVariantId: String(variant?.id ?? ''),
				},
			});
			created++;
		} catch (err) {
			errors.push(
				`${product.name}: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	await prisma.syncLog.create({
		data: {
			provider: 'SHOPIFY',
			type: 'PRODUCT_CREATE',
			status:
				created === 0 && errors.length > 0
					? 'FAILED'
					: errors.length > 0
						? 'PARTIAL'
						: 'SUCCESS',
			message: `Created ${created} product(s) on ${shop}${errors.length ? `, ${errors.length} error(s)` : ''}`,
			recordsIn: items.length,
			recordsOut: created,
		},
	});

	return NextResponse.json({ created, errors });
}
