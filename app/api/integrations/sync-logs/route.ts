import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const provider = searchParams.get('provider') ?? undefined;
	const page = parseInt(searchParams.get('page') ?? '1', 10);
	const limit = parseInt(searchParams.get('limit') ?? '20', 10);
	const skip = (page - 1) * limit;

	const where = provider ? { provider: provider as never } : {};

	const [logs, total] = await Promise.all([
		prisma.syncLog.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit,
		}),
		prisma.syncLog.count({ where }),
	]);

	return NextResponse.json({ data: logs, total, page, limit });
}
