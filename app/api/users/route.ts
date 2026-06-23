import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function GET() {
	const _auth = await requireRole('ADMIN');
	if (_auth instanceof NextResponse) return _auth;

	const users = await prisma.user.findMany({
		orderBy: { createdAt: 'asc' },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			role: true,
			createdAt: true,
			sessions: {
				orderBy: { createdAt: 'desc' },
				take: 1,
				select: { createdAt: true },
			},
		},
	});

	return NextResponse.json(
		users.map((u) => ({
			id: u.id,
			name: u.name,
			email: u.email,
			image: u.image,
			role: u.role,
			createdAt: u.createdAt,
			lastSeenAt: u.sessions[0]?.createdAt ?? null,
		}))
	);
}
