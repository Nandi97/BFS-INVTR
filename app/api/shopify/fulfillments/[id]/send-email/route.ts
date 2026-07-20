import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { sendMail } from '@/lib/mailer';
import { generateShopifyPackingSlipPdf } from '@/lib/shopify-packing-slip-pdf';
import { getEmailRecipients } from '@/lib/email-recipients';

export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;

	const fulfillment = await prisma.shopifyFulfillment.findUnique({
		where: { id },
		include: {
			items: {
				include: {
					product: { select: { brand: { select: { name: true } } } },
				},
				orderBy: { sortOrder: 'asc' },
			},
			order: true,
		},
	});

	if (!fulfillment)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const { order } = fulfillment;
	const storeName = order.storeDomain.replace('.myshopify.com', '');

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

	const [recipients, pdf] = await Promise.all([
		getEmailRecipients(),
		generateShopifyPackingSlipPdf({
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
				isInverness:
					item.product?.brand?.name?.toLowerCase() === 'inverness',
				notes: item.notes,
			})),
		}),
	]);

	const totalUnits = fulfillment.items.reduce(
		(s, i) => s + i.fulfilledQty,
		0
	);
	const dateStr = new Date().toLocaleDateString('en-CA');
	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL ?? 'https://bfs.kigtech.digital';

	const subject = `Packing List — Order ${order.orderNumber} — ${storeName}`;

	const labelStyle =
		'padding:8px 0;font-weight:600;width:150px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;';
	const valStyle = 'padding:8px 0;color:#1e293b;';
	const rowBorder = 'border-top:1px solid #f1f5f9;';

	const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:580px;margin:0 auto;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.10);">
	<div style="background:#d4006e;padding:20px 24px;">
		<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">Packing List</h2>
		<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
			Packed ${dateStr} &middot; ${storeName}
		</p>
	</div>

	<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px 24px;">
		<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
			<tr>
				<td style="${labelStyle}">Order #</td>
				<td style="padding:8px 0;font-weight:700;font-size:16px;color:#0f172a;">${order.orderNumber}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Customer</td>
				<td style="${valStyle}${rowBorder}">${order.customerName ?? '—'}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Packed on</td>
				<td style="${valStyle}${rowBorder}">${dateStr}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Units</td>
				<td style="${valStyle}${rowBorder}">${totalUnits}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Total</td>
				<td style="${valStyle}${rowBorder}">${order.currency} $${(order.totalPrice ?? subtotal).toFixed(2)}</td>
			</tr>
		</table>

		<p style="font-size:14px;color:#334155;margin:0 0 16px;">
			The PDF packing slip is attached. This order syncs to QuickBooks automatically via the QBO Shopify app — please verify the invoice there.
		</p>

		<p style="margin:0 0 20px;">
			<a href="${appUrl}/shopify/${order.id}" style="background:#d4006e;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:13px;">
				View in BFS Inventory &rarr;
			</a>
		</p>

		<hr style="border:none;border-top:1px solid #f1f5f9;margin:16px 0;" />
		<p style="color:#94a3b8;font-size:12px;margin:0;">
			BFS Inventory &middot; <a href="${appUrl}" style="color:#94a3b8;">${appUrl}</a>
		</p>
	</div>
</div>
</body>
</html>`;

	await sendMail({
		to: recipients.shopify_packing_list_to,
		...(recipients.shopify_packing_list_cc
			? { cc: recipients.shopify_packing_list_cc }
			: {}),
		subject,
		html,
		attachments: [
			{
				filename: `packing-slip-${order.orderNumber.replace(/[^a-z0-9]/gi, '')}.pdf`,
				content: pdf,
				contentType: 'application/pdf',
			},
		],
	});

	return NextResponse.json({ ok: true });
}
