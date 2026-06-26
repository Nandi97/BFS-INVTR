import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkQbRefreshToken } from '@/lib/qb-token-check';

// Called nightly by Vercel cron (or any external cron service).
// Vercel sends: Authorization: Bearer <CRON_SECRET>
// External services must send the same header.
export async function GET(req: NextRequest) {
	const auth = req.headers.get('authorization');
	if (
		!process.env.CRON_SECRET ||
		auth !== `Bearer ${process.env.CRON_SECRET}`
	) {
		console.warn('[cron/sync] unauthorized — check CRON_SECRET env var');
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	const base = process.env.NEXT_PUBLIC_APP_URL;
	if (!base || base.includes('localhost')) {
		console.error(
			'[cron/sync] NEXT_PUBLIC_APP_URL is not set to a production URL:',
			base
		);
		return NextResponse.json(
			{ error: 'NEXT_PUBLIC_APP_URL misconfigured' },
			{ status: 500 }
		);
	}

	console.log(
		`[cron/sync] starting — ${new Date().toISOString()} — base: ${base}`
	);

	const headers = {
		'Content-Type': 'application/json',
		authorization: `Bearer ${process.env.CRON_SECRET}`,
	};

	const results: Record<string, unknown> = {};

	// 1 — Stock sync via QB Items API
	try {
		console.log('[cron/sync] step 1: stock sync');
		const res = await fetch(`${base}/api/integrations/quickbooks/items`, {
			method: 'POST',
			headers,
			body: JSON.stringify({ location: 'BF Warehouse' }),
		});
		results.stock = await res.json();
		console.log(
			'[cron/sync] step 1 done:',
			JSON.stringify(results.stock).slice(0, 200)
		);
	} catch (err) {
		results.stock = {
			error: err instanceof Error ? err.message : String(err),
		};
		console.error('[cron/sync] step 1 failed:', results.stock);
	}

	// 2 — Shopify: pull new orders + push inventory levels
	try {
		console.log('[cron/sync] step 2a: shopify order sync');
		const resOrders = await fetch(`${base}/api/integrations/shopify/sync`, {
			method: 'POST',
			headers,
		});
		results.shopifyOrders = await resOrders.json();
		console.log(
			'[cron/sync] step 2a done:',
			JSON.stringify(results.shopifyOrders).slice(0, 200)
		);
	} catch (err) {
		results.shopifyOrders = {
			error: err instanceof Error ? err.message : String(err),
		};
		console.error('[cron/sync] step 2a failed:', results.shopifyOrders);
	}

	try {
		console.log('[cron/sync] step 2b: shopify inventory sync');
		const resInv = await fetch(
			`${base}/api/integrations/shopify/sync-inventory`,
			{ method: 'POST', headers }
		);
		results.shopifyInventory = await resInv.json();
		console.log(
			'[cron/sync] step 2b done:',
			JSON.stringify(results.shopifyInventory).slice(0, 200)
		);
	} catch (err) {
		results.shopifyInventory = {
			error: err instanceof Error ? err.message : String(err),
		};
		console.error('[cron/sync] step 2b failed:', results.shopifyInventory);
	}

	// 3 — Check QB refresh token expiry (emails admin if ≤7 days)
	try {
		console.log('[cron/sync] step 2: token check');
		results.tokenCheck = await checkQbRefreshToken();
		console.log(
			'[cron/sync] step 2 done:',
			JSON.stringify(results.tokenCheck).slice(0, 200)
		);
	} catch (err) {
		results.tokenCheck = {
			error: err instanceof Error ? err.message : String(err),
		};
		console.error('[cron/sync] step 2 failed:', results.tokenCheck);
	}

	await prisma.integrationConfig
		.update({
			where: { provider: 'QUICKBOOKS' },
			data: { lastSyncAt: new Date() },
		})
		.catch(() => null);

	console.log(`[cron/sync] complete — ${new Date().toISOString()}`);
	return NextResponse.json({
		ok: true,
		ran: new Date().toISOString(),
		results,
	});
}
