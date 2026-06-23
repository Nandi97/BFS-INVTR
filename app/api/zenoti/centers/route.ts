import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/require-role';
import { fetchZenotiCenters } from '@/lib/zenoti';
import type { ZenotiOrg } from '@/lib/zenoti';

export async function GET() {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const orgs: ZenotiOrg[] = ['bfs', 'bl'];
	const results: Record<string, unknown> = {};

	for (const org of orgs) {
		const apiKeyEnv =
			org === 'bfs' ? 'ZENOTI_BFS_API_KEY' : 'ZENOTI_BL_API_KEY';
		if (!process.env[apiKeyEnv]) {
			results[org] = { error: `${apiKeyEnv} not set` };
			continue;
		}
		try {
			const centers = await fetchZenotiCenters(org);
			results[org] = centers;
		} catch (err: unknown) {
			results[org] = {
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	return NextResponse.json(results);
}
