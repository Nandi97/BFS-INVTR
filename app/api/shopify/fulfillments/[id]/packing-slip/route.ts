import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { generateShopifyPackingSlipPdf } from '@/lib/shopify-packing-slip-pdf';

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('VIEWER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;

	const fulfillment = await prisma.shopifyFulfillment.findUnique({
		where: { id },
		include: {
			items: {
				include: {
					product: {
						select: { brand: { select: { isWarehoused: true } } },
					},
				},
				orderBy: { sortOrder: 'asc' },
			},
			order: true,
		},
	});

	if (!fulfillment)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const { order } = fulfillment;

	const shippingLines = [
		order.shippingName,
		order.shippingAddress1,
		[order.shippingCity, order.shippingProvince, order.shippingZip]
			.filter(Boolean)
			.join(', '),
		order.shippingCountry,
	].filter((l): l is string => !!l);

	const subtotal = fulfillment.items.reduce(
		(sum, i) => sum + (i.unitPrice ?? 0) * i.fulfilledQty,
		0
	);

	const pdf = await generateShopifyPackingSlipPdf({
		orderNumber: order.orderNumber,
		storeDomain: order.storeDomain,
		customerName: order.customerName,
		shippingLines,
		currency: order.currency,
		subtotal,
		totalDiscounts: order.totalDiscounts ?? 0,
		discountCodes: order.discountCodes,
		total: order.totalPrice ?? subtotal - (order.totalDiscounts ?? 0),
		packedAt: fulfillment.submittedAt ?? new Date(),
		packedBy: fulfillment.submittedBy ?? auth.user.email,
		items: fulfillment.items.map((item) => ({
			sku: item.sku,
			title: item.title,
			variantTitle: item.variantTitle,
			requestedQty: item.requestedQty,
			fulfilledQty: item.fulfilledQty,
			unitPrice: item.unitPrice,
			totalDiscount: item.totalDiscount,
			isPacked: item.isPacked,
			isNonWarehoused: item.product?.brand?.isWarehoused === false,
			notes: item.notes,
		})),
	});

	const filename = `packing-slip-${order.orderNumber.replace(/[^a-z0-9]/gi, '')}.pdf`;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return new Response(pdf as any, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': String(pdf.length),
		},
	});
}
