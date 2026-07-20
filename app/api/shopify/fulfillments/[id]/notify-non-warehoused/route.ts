import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { sendMail } from '@/lib/mailer';
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
					product: {
						select: {
							brand: {
								select: { name: true, isWarehoused: true },
							},
						},
					},
				},
				orderBy: { sortOrder: 'asc' },
			},
			order: true,
		},
	});

	if (!fulfillment)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const nonWarehousedItems = fulfillment.items.filter(
		(i) => i.product?.brand?.isWarehoused === false
	);
	if (nonWarehousedItems.length === 0) {
		return NextResponse.json(
			{ error: 'No non-warehoused items on this order' },
			{ status: 400 }
		);
	}

	const { order } = fulfillment;
	const storeName = order.storeDomain.replace('.myshopify.com', '');
	const recipients = await getEmailRecipients();
	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL ?? 'https://bfs.kigtech.digital';
	const orderUrl = `${appUrl}/shopify/${order.id}`;
	const brandNames = [
		...new Set(
			nonWarehousedItems
				.map((i) => i.product?.brand?.name)
				.filter(Boolean)
		),
	].join(', ');

	const subject = `[Action Required] Not stocked in-house — Order ${order.orderNumber} — ${storeName}`;

	const labelStyle =
		'padding:8px 0;font-weight:600;width:130px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;';
	const valStyle = 'padding:8px 0;color:#1e293b;';
	const rowBorder = 'border-top:1px solid #f1f5f9;';

	const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:580px;margin:0 auto;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.10);">
	<div style="background:#7c3aed;padding:20px 24px;">
		<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">Not Stocked In-House — Action Required</h2>
		<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
			Flagged by ${auth.user.email} &middot; ${new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
		</p>
	</div>

	<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px 24px;">
		<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
			<tr>
				<td style="${labelStyle}">Order #</td>
				<td style="padding:8px 0;font-weight:700;font-size:16px;color:#0f172a;">${order.orderNumber}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Store</td>
				<td style="${valStyle}${rowBorder}">${storeName}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Customer</td>
				<td style="${valStyle}${rowBorder}">${order.customerName ?? '—'}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Brand${brandNames.includes(',') ? 's' : ''}</td>
				<td style="${valStyle}${rowBorder}">${brandNames}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Items</td>
				<td style="${valStyle}${rowBorder}">${nonWarehousedItems.length} line item${nonWarehousedItems.length !== 1 ? 's' : ''}</td>
			</tr>
		</table>

		<p style="margin:0 0 12px;font-size:14px;color:#334155;">
			This order contains items not stocked in our warehouse. These need to be sourced/invoiced separately rather than packed from stock.
		</p>
		<p style="margin:0 0 20px;">
			<a href="${orderUrl}" style="background:#7c3aed;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:13px;">
				View Order &rarr;
			</a>
		</p>

		<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;border-radius:6px;overflow:hidden;">
			<thead>
				<tr style="background:#1e293b;">
					<th style="padding:7px 8px;text-align:left;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;">SKU</th>
					<th style="padding:7px 8px;text-align:left;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;">Product</th>
					<th style="padding:7px 8px;text-align:right;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;">Qty</th>
				</tr>
			</thead>
			<tbody>
				${nonWarehousedItems
					.map(
						(item, i) => `
				<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
					<td style="padding:6px 8px;font-family:'Courier New',monospace;color:#64748b;font-size:11px;">${item.sku ?? ''}</td>
					<td style="padding:6px 8px;color:#1e293b;">${item.title}</td>
					<td style="padding:6px 8px;text-align:right;color:#1e293b;">${item.requestedQty}</td>
				</tr>`
					)
					.join('')}
			</tbody>
		</table>

		<hr style="border:none;border-top:1px solid #f1f5f9;margin:16px 0;" />
		<p style="color:#94a3b8;font-size:12px;margin:0;">
			BFS Inventory &middot; <a href="${appUrl}" style="color:#94a3b8;">${appUrl}</a>
		</p>
	</div>
</div>
</body>
</html>`;

	await sendMail({
		to: recipients.shopify_non_warehoused_notify_to,
		subject,
		html,
	});

	return NextResponse.json({
		ok: true,
		itemCount: nonWarehousedItems.length,
	});
}
