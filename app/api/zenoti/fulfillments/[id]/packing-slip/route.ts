import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { generatePackingSlipPdf } from '@/lib/packing-slip-pdf';

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('VIEWER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;

	const fulfillment = await prisma.bfsFulfillment.findUnique({
		where: { id },
		include: { items: { orderBy: { sortOrder: 'asc' } }, order: true },
	});

	if (!fulfillment)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const { order } = fulfillment;

	const pdf = await generatePackingSlipPdf({
		orderNumber: order.orderNumber,
		centerName: order.centerName,
		org: order.org,
		supplier: order.supplier,
		raisedAt: order.raisedAt,
		deliverBy: order.deliverBy,
		packedAt: fulfillment.submittedAt ?? new Date(),
		packedBy: fulfillment.submittedBy ?? auth.user.email,
		items: fulfillment.items,
	});

	const filename = `packing-slip-${order.centerName.toLowerCase().replace(/\s+/g, '-')}-order-${order.orderNumber}.pdf`;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return new Response(pdf as any, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': String(pdf.length),
		},
	});
}
