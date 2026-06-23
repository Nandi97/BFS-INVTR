import { NextResponse } from 'next/server';
import { runAlertRules } from '@/lib/notification-engine';
import { requireRole } from '@/lib/require-role';

export async function POST() {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	try {
		const result = await runAlertRules();
		return NextResponse.json(result);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
