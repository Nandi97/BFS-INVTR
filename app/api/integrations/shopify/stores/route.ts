import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET() {
	const row = await prisma.integrationConfig.findUnique({
		where: { provider: 'SHOPIFY' },
	});

	type ShopifyStore = {
		shop: string;
		scope: string;
		connectedAt: string;
	};

	const cfg = (row?.config ?? {}) as { stores?: ShopifyStore[] };
	const stores = (cfg.stores ?? []).map(({ shop, scope, connectedAt }) => ({
		shop,
		scope,
		connectedAt,
	}));

	return NextResponse.json({ stores, isActive: row?.isActive ?? false });
}

export async function DELETE(req: NextRequest) {
	const auth = await requireRole('ADMIN');
	if (auth instanceof NextResponse) return auth;

	const { shop } = await req.json();
	if (!shop) {
		return NextResponse.json({ error: 'shop required' }, { status: 400 });
	}

	const existing = await prisma.integrationConfig.findUnique({
		where: { provider: 'SHOPIFY' },
	});

	if (!existing) return NextResponse.json({ ok: true });

	type StoreEntry = {
		shop: string;
		accessToken: string;
		scope: string;
		connectedAt: string;
	};
	const cfg = existing.config as { stores?: StoreEntry[] };
	const stores = (cfg.stores ?? []).filter((s) => s.shop !== shop);

	await prisma.integrationConfig.update({
		where: { provider: 'SHOPIFY' },
		data: {
			config: { stores },
			isActive: stores.length > 0,
		},
	});

	return NextResponse.json({ ok: true });
}
