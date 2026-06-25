import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export const RECIPIENT_KEYS = [
	'zenoti_email_warehouse',
	'zenoti_email_costco',
	'zenoti_email_inverness',
	'zenoti_email_other',
	'zenoti_email_packing_list_to',
	'zenoti_email_packing_list_cc',
] as const;

export type RecipientKey = (typeof RECIPIENT_KEYS)[number];

export const RECIPIENT_DEFAULTS: Record<RecipientKey, string> = {
	zenoti_email_warehouse: 'order@beautylogix.ca',
	zenoti_email_costco: 'accounting@beautyfirstspa.com',
	zenoti_email_inverness: 'accounting@beautyfirstspa.com',
	zenoti_email_other: 'order@beautylogix.ca',
	zenoti_email_packing_list_to: 'order@beautylogix.ca',
	zenoti_email_packing_list_cc: '',
};

export async function GET(_req: Request) {
	const auth = await requireRole('VIEWER');
	if (auth instanceof NextResponse) return auth;

	const rows = await prisma.appSetting.findMany({
		where: { key: { in: [...RECIPIENT_KEYS] } },
	});

	const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
	const result = Object.fromEntries(
		RECIPIENT_KEYS.map((k) => [k, stored[k] ?? RECIPIENT_DEFAULTS[k]])
	);

	return NextResponse.json(result);
}

export async function PATCH(req: Request) {
	const auth = await requireRole('ADMIN');
	if (auth instanceof NextResponse) return auth;

	const body = await req.json();

	await prisma.$transaction(
		RECIPIENT_KEYS.filter((k) => body[k] !== undefined).map((k) =>
			prisma.appSetting.upsert({
				where: { key: k },
				create: { key: k, value: String(body[k]) },
				update: { value: String(body[k]) },
			})
		)
	);

	return NextResponse.json({ ok: true });
}
