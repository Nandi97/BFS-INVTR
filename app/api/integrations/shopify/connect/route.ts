import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireRole } from '@/lib/require-role';

const SCOPES =
	'read_orders,write_orders,read_inventory,write_inventory,read_products';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function GET(req: NextRequest) {
	const auth = await requireRole('ADMIN');
	if (auth instanceof NextResponse) return auth;

	const shop = req.nextUrl.searchParams.get('shop');
	if (!shop) {
		return NextResponse.json(
			{ error: 'shop param required' },
			{ status: 400 }
		);
	}

	const clientId = process.env.SHOPIFY_CLIENT_ID;
	if (!clientId) {
		return NextResponse.json(
			{ error: 'SHOPIFY_CLIENT_ID not configured' },
			{ status: 503 }
		);
	}

	const state = crypto.randomUUID();
	const jar = await cookies();
	jar.set('shopify_oauth_state', state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 600,
		path: '/',
	});

	const redirectUri = `${APP_URL}/api/integrations/shopify/callback`;

	const params = new URLSearchParams({
		client_id: clientId,
		scope: SCOPES,
		redirect_uri: redirectUri,
		state,
	});

	return NextResponse.redirect(
		`https://${shop}/admin/oauth/authorize?${params}`
	);
}
