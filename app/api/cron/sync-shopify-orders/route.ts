import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
	const auth = req.headers.get('authorization');
	if (
		!process.env.CRON_SECRET ||
		auth !== `Bearer ${process.env.CRON_SECRET}`
	) {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	const base = process.env.NEXT_PUBLIC_APP_URL;
	if (!base || base.includes('localhost')) {
		return NextResponse.json(
			{ error: 'NEXT_PUBLIC_APP_URL misconfigured' },
			{ status: 500 }
		);
	}

	console.log('[cron/sync-shopify-orders] starting nightly order sync');

	const res = await fetch(`${base}/api/integrations/shopify/sync`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${process.env.CRON_SECRET}`,
			'Content-Type': 'application/json',
		},
	});

	const result = await res.json();
	console.log(
		'[cron/sync-shopify-orders] done:',
		JSON.stringify(result).slice(0, 300)
	);

	return NextResponse.json({ ok: true, shopifyOrders: result });
}
