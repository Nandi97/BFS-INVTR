import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/prisma';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;
	const code = searchParams.get('code');
	const shop = searchParams.get('shop');
	const state = searchParams.get('state');
	const hmac = searchParams.get('hmac');

	const fail = (msg: string) =>
		NextResponse.redirect(
			`${APP_URL}/integrations?shopify_error=${encodeURIComponent(msg)}`
		);

	if (!code || !shop || !state || !hmac) return fail('missing_params');

	// Verify CSRF state
	const jar = await cookies();
	const expectedState = jar.get('shopify_oauth_state')?.value;
	jar.delete('shopify_oauth_state');
	jar.delete('shopify_oauth_shop');

	if (!expectedState || state !== expectedState)
		return fail('state_mismatch');

	// Verify HMAC
	const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
	if (!clientSecret) return fail('no_client_secret');

	const message = Array.from(searchParams.entries())
		.filter(([k]) => k !== 'hmac')
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`)
		.join('&');

	const expected = createHmac('sha256', clientSecret)
		.update(message)
		.digest('hex');

	if (expected !== hmac) return fail('hmac_invalid');

	// Exchange code for access token
	const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: process.env.SHOPIFY_CLIENT_ID,
			client_secret: clientSecret,
			code,
		}),
	});

	if (!tokenRes.ok) {
		const text = await tokenRes.text().catch(() => 'unknown');
		return fail(`token_exchange_failed: ${text}`);
	}

	const { access_token, scope } = (await tokenRes.json()) as {
		access_token: string;
		scope: string;
	};

	// Upsert store in IntegrationConfig
	const existing = await prisma.integrationConfig.findUnique({
		where: { provider: 'SHOPIFY' },
	});

	type ShopifyStore = {
		shop: string;
		accessToken: string;
		scope: string;
		connectedAt: string;
	};

	const existingCfg = (existing?.config ?? {}) as { stores?: ShopifyStore[] };
	const stores: ShopifyStore[] = existingCfg.stores ?? [];

	const idx = stores.findIndex((s) => s.shop === shop);
	const entry: ShopifyStore = {
		shop,
		accessToken: access_token,
		scope,
		connectedAt: new Date().toISOString(),
	};

	if (idx >= 0) {
		stores[idx] = entry;
	} else {
		stores.push(entry);
	}

	await prisma.integrationConfig.upsert({
		where: { provider: 'SHOPIFY' },
		create: {
			provider: 'SHOPIFY',
			config: { stores },
			isActive: true,
		},
		update: {
			config: { stores },
			isActive: true,
		},
	});

	return NextResponse.redirect(
		`${APP_URL}/integrations?shopify_connected=${encodeURIComponent(shop)}`
	);
}
