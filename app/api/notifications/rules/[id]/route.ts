import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	const { id } = await params;
	const body = await req.json();
	const { name, recipients, thresholdMonths, isActive } = body;

	const recipientList: string[] | undefined =
		recipients !== undefined
			? Array.isArray(recipients)
				? recipients.filter((r: string) => r?.trim())
				: typeof recipients === 'string'
					? recipients
							.split(',')
							.map((r: string) => r.trim())
							.filter(Boolean)
					: undefined
			: undefined;

	const rule = await prisma.alertRule.update({
		where: { id },
		data: {
			...(name !== undefined ? { name: name.trim() } : {}),
			...(recipientList !== undefined
				? { recipients: recipientList }
				: {}),
			...(thresholdMonths !== undefined
				? {
						thresholdMonths:
							thresholdMonths !== null
								? Number(thresholdMonths)
								: null,
					}
				: {}),
			...(isActive !== undefined ? { isActive } : {}),
		},
	});

	return NextResponse.json(rule);
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	const { id } = await params;
	await prisma.alertRule.delete({ where: { id } });
	return new NextResponse(null, { status: 204 });
}
