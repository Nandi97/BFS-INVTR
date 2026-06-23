import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getQboTokens } from '@/lib/qbo';
import { requireRole } from '@/lib/require-role';

export interface QbConfig {
	companyName: string;
	defaultLocation: string;
	notes: string;
}

const DEFAULT: QbConfig = {
	companyName: '',
	defaultLocation: 'BF Warehouse',
	notes: '',
};

export async function GET() {
	const row = await prisma.integrationConfig.findUnique({
		where: { provider: 'QUICKBOOKS' },
	});
	const cfg = (row?.config ?? {}) as Record<string, unknown>;
	const { oauth, ...rest } = cfg;
	const config: QbConfig = { ...DEFAULT, ...(rest as Partial<QbConfig>) };

	const tokens = await getQboTokens();
	const connected = !!tokens;
	const realmId = tokens?.realmId ?? null;
	const tokenExpiresAt = tokens?.refreshTokenExpiresAt ?? null;

	return NextResponse.json({
		config,
		isActive: row?.isActive ?? false,
		lastSyncAt: row?.lastSyncAt ?? null,
		connected,
		realmId,
		tokenExpiresAt,
	});
}

export async function PUT(req: NextRequest) {
	const _auth = await requireRole('ADMIN');
	if (_auth instanceof NextResponse) return _auth;

	const body: Partial<QbConfig> = await req.json();
	const existing = await prisma.integrationConfig.findUnique({
		where: { provider: 'QUICKBOOKS' },
	});
	const existingCfg = (existing?.config ?? {}) as Record<string, unknown>;
	// Preserve oauth tokens; only update the user-facing fields
	const merged = { ...existingCfg, ...DEFAULT, ...body };

	const row = await prisma.integrationConfig.upsert({
		where: { provider: 'QUICKBOOKS' },
		update: { config: merged, isActive: true, updatedAt: new Date() },
		create: { provider: 'QUICKBOOKS', config: merged, isActive: true },
	});

	return NextResponse.json({ config: row.config, isActive: row.isActive });
}
