import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET(req: NextRequest) {
	const auth = await requireRole('VIEWER');
	if (auth instanceof NextResponse) return auth;

	const shop = req.nextUrl.searchParams.get('shop');
	if (!shop) {
		return NextResponse.json({ error: 'shop required' }, { status: 400 });
	}

	const settings = await prisma.shopifyStoreSettings.findUnique({
		where: { storeDomain: shop },
		include: { brandRules: { select: { brandId: true } } },
	});

	return NextResponse.json({
		label: settings?.label ?? null,
		catalogMode: settings?.catalogMode ?? 'ALL',
		brandIds: settings?.brandRules.map((r) => r.brandId) ?? [],
	});
}

export async function PUT(req: NextRequest) {
	const auth = await requireRole('ADMIN');
	if (auth instanceof NextResponse) return auth;

	const body = await req.json().catch(() => ({}));
	const shop: string | undefined = body?.shop;
	const label: string | null | undefined = body?.label;
	const catalogMode: 'ALL' | 'BRAND_FILTERED' | undefined = body?.catalogMode;
	const brandIds: string[] | undefined = body?.brandIds;

	if (!shop) {
		return NextResponse.json({ error: 'shop required' }, { status: 400 });
	}
	if (catalogMode && !['ALL', 'BRAND_FILTERED'].includes(catalogMode)) {
		return NextResponse.json(
			{ error: 'catalogMode must be ALL or BRAND_FILTERED' },
			{ status: 400 }
		);
	}

	await prisma.$transaction(async (tx) => {
		await tx.shopifyStoreSettings.upsert({
			where: { storeDomain: shop },
			create: {
				storeDomain: shop,
				label: label ?? null,
				catalogMode: catalogMode ?? 'ALL',
			},
			update: {
				...(label !== undefined ? { label } : {}),
				...(catalogMode !== undefined ? { catalogMode } : {}),
			},
		});

		if (brandIds !== undefined) {
			await tx.shopifyStoreBrandRule.deleteMany({
				where: { storeDomain: shop },
			});
			if (brandIds.length > 0) {
				await tx.shopifyStoreBrandRule.createMany({
					data: brandIds.map((brandId) => ({
						storeDomain: shop,
						brandId,
					})),
				});
			}
		}
	});

	return NextResponse.json({ ok: true });
}
