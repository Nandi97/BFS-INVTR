import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

type Role = 'ADMIN' | 'MANAGER' | 'VIEWER';

const RANK: Record<Role, number> = { ADMIN: 2, MANAGER: 1, VIEWER: 0 };

export interface AuthedUser {
	id: string;
	email: string;
	role: Role;
}

type RequireRoleResult = { user: AuthedUser } | NextResponse;

/**
 * Call at the top of any write handler.
 * Returns { user } on success, or a 401/403 NextResponse to return immediately.
 *
 * Usage:
 *   const result = await requireRole("MANAGER");
 *   if (result instanceof NextResponse) return result;
 *   const { user } = result;
 */
export async function requireRole(minRole: Role): Promise<RequireRoleResult> {
	const h = await headers();

	// Allow server-to-server calls (e.g. cron → internal API) authenticated by CRON_SECRET
	const authHeader = h.get('authorization');
	if (
		process.env.CRON_SECRET &&
		authHeader === `Bearer ${process.env.CRON_SECRET}`
	) {
		return { user: { id: 'cron', email: 'cron@system', role: 'ADMIN' } };
	}

	const session = await auth.api.getSession({ headers: h });

	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userRole = (session.user.role as Role | undefined) ?? 'VIEWER';

	if (RANK[userRole] < RANK[minRole]) {
		return NextResponse.json(
			{ error: `Forbidden — requires ${minRole} role` },
			{ status: 403 }
		);
	}

	return {
		user: {
			id: session.user.id,
			email: session.user.email,
			role: userRole,
		},
	};
}
