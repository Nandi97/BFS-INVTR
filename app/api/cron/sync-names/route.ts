import { NextRequest, NextResponse } from 'next/server';

/** Monthly cron: runs on the 1st of each month at 07:00 UTC.
 *  Triggers the QB name sync — overwrites product names from QB Items (SKU-matched only).
 *  Protected by the same CRON_SECRET as the nightly sync.
 */
export async function GET(req: NextRequest) {
	const auth = req.headers.get('authorization');
	if (
		!process.env.CRON_SECRET ||
		auth !== `Bearer ${process.env.CRON_SECRET}`
	) {
		console.warn(
			'[cron/sync-names] unauthorized — check CRON_SECRET env var'
		);
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	const base = process.env.NEXT_PUBLIC_APP_URL;
	if (!base || base.includes('localhost')) {
		console.error(
			'[cron/sync-names] NEXT_PUBLIC_APP_URL is not set to a production URL:',
			base
		);
		return NextResponse.json(
			{ error: 'NEXT_PUBLIC_APP_URL misconfigured' },
			{ status: 500 }
		);
	}

	console.log(
		`[cron/sync-names] starting — ${new Date().toISOString()} — base: ${base}`
	);

	const headers = {
		'Content-Type': 'application/json',
		authorization: `Bearer ${process.env.CRON_SECRET}`,
	};

	try {
		const res = await fetch(
			`${base}/api/integrations/quickbooks/items/sync-names`,
			{ method: 'POST', headers }
		);
		const result = await res.json();
		console.log(
			`[cron/sync-names] complete — ${new Date().toISOString()}:`,
			JSON.stringify(result).slice(0, 300)
		);
		return NextResponse.json({
			ok: true,
			ran: new Date().toISOString(),
			result,
		});
	} catch (err) {
		const error = err instanceof Error ? err.message : String(err);
		console.error('[cron/sync-names] failed:', error);
		return NextResponse.json({ ok: false, error });
	}
}
