import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens } from '@/lib/qbo';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;
	const code = searchParams.get('code');
	const state = searchParams.get('state');
	const realmId = searchParams.get('realmId');
	const error = searchParams.get('error');

	// User denied or QBO returned an error
	if (error) {
		return NextResponse.redirect(
			`${APP_URL}/integrations?qbo_error=${encodeURIComponent(error)}`
		);
	}

	if (!code || !state || !realmId) {
		return NextResponse.redirect(
			`${APP_URL}/integrations?qbo_error=missing_params`
		);
	}

	// Verify CSRF state
	const jar = await cookies();
	const expectedState = jar.get('qbo_oauth_state')?.value;
	jar.delete('qbo_oauth_state');

	if (!expectedState || state !== expectedState) {
		return NextResponse.redirect(
			`${APP_URL}/integrations?qbo_error=state_mismatch`
		);
	}

	try {
		await exchangeCodeForTokens(code, realmId);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : 'unknown';
		return NextResponse.redirect(
			`${APP_URL}/integrations?qbo_error=${encodeURIComponent(msg)}`
		);
	}

	return NextResponse.redirect(`${APP_URL}/integrations?qbo_connected=1`);
}
