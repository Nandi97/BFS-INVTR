import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { sendMail } from '@/lib/mailer';
import { getEmailRecipients } from '@/lib/email-recipients';
import { getSupplierType } from '@/lib/zenoti-email';

const TYPE_META: Record<
	string,
	{ label: string; settingKey: string; colour: string; actionNote: string }
> = {
	WAREHOUSE: {
		label: 'Warehouse Order',
		settingKey: 'zenoti_email_warehouse',
		colour: '#16a34a',
		actionNote:
			'This order requires warehouse packing. Open BFS Inventory to begin fulfillment:',
	},
	COSTCO: {
		label: 'Costco Order',
		settingKey: 'zenoti_email_costco',
		colour: '#2563eb',
		actionNote:
			'A Costco purchase order has been received and requires your attention:',
	},
	INVERNESS: {
		label: 'Inverness Order',
		settingKey: 'zenoti_email_inverness',
		colour: '#7c3aed',
		actionNote:
			'An Inverness purchase order has been received and requires your attention:',
	},
	OTHER: {
		label: 'External Order',
		settingKey: 'zenoti_email_other',
		colour: '#6b7280',
		actionNote:
			'A purchase order has been received and requires your attention:',
	},
};

export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;

	const order = await prisma.zenotiOrder.findUnique({
		where: { id },
		include: { items: true },
	});

	if (!order)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const supplierType = getSupplierType(order.supplier);
	const meta = TYPE_META[supplierType];
	const recipients = await getEmailRecipients();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const to = (recipients as any)[meta.settingKey] as string;

	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL ?? 'https://bfs.kigtech.digital';
	const orderUrl = `${appUrl}/zenoti/${order.id}`;
	const orgLabel = order.org === 'bfs' ? 'Beauty First Spa' : 'Beauty Logix';

	const subject = `[Action Required] ${meta.label} #${order.orderNumber} — ${order.centerName}`;

	const labelStyle =
		'padding:8px 0;font-weight:600;width:130px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;';
	const valStyle = 'padding:8px 0;color:#1e293b;';
	const rowBorder = 'border-top:1px solid #f1f5f9;';

	const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:580px;margin:0 auto;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.10);">
	<div style="background:${meta.colour};padding:20px 24px;">
		<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">${meta.label} &mdash; Action Required</h2>
		<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
			Sent by ${auth.user.email} &middot; ${new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
				<td style="${valStyle}${rowBorder}">${order.centerName}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Organisation</td>
				<td style="${valStyle}${rowBorder}">${orgLabel}</td>
			</tr>
			${
				order.supplier
					? `
			<tr>
				<td style="${labelStyle}${rowBorder}">Supplier</td>
				<td style="${valStyle}${rowBorder}">${order.supplier}</td>
			</tr>`
					: ''
			}
			<tr>
				<td style="${labelStyle}${rowBorder}">Items</td>
				<td style="${valStyle}${rowBorder}">${order.items.length} line item${order.items.length !== 1 ? 's' : ''}</td>
			</tr>
			${
				order.raisedAt
					? `
			<tr>
				<td style="${labelStyle}${rowBorder}">Raised</td>
				<td style="${valStyle}${rowBorder}">${new Date(order.raisedAt).toLocaleDateString('en-CA')}</td>
			</tr>`
					: ''
			}
			${
				order.deliverBy
					? `
			<tr>
				<td style="${labelStyle}${rowBorder}">Deliver by</td>
				<td style="${valStyle}${rowBorder}${new Date(order.deliverBy) < new Date() ? 'color:#dc2626;font-weight:600;' : ''}">${new Date(order.deliverBy).toLocaleDateString('en-CA')}</td>
			</tr>`
					: ''
			}
		</table>

		<p style="margin:0 0 12px;font-size:14px;color:#334155;">${meta.actionNote}</p>
		<p style="margin:0 0 20px;">
			<a href="${orderUrl}" style="background:${meta.colour};color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:13px;">
				View Order &rarr;
			</a>
		</p>

		${
			order.items.length > 0
				? `
		<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;border-radius:6px;overflow:hidden;">
			<thead>
				<tr style="background:#1e293b;">
					<th style="padding:7px 8px;text-align:left;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;">Code</th>
					<th style="padding:7px 8px;text-align:left;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;">Product</th>
					<th style="padding:7px 8px;text-align:right;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;">Retail</th>
					<th style="padding:7px 8px;text-align:right;color:#fff;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.4px;">Consumable</th>
				</tr>
			</thead>
			<tbody>
				${order.items
					.map(
						(item, i) => `
				<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
					<td style="padding:6px 8px;font-family:'Courier New',monospace;color:#64748b;font-size:11px;">${item.productCode ?? ''}</td>
					<td style="padding:6px 8px;color:#1e293b;">${item.productName}</td>
					<td style="padding:6px 8px;text-align:right;color:#1e293b;">${item.retailRaised || '&mdash;'}</td>
					<td style="padding:6px 8px;text-align:right;color:#1e293b;">${item.consumableRaised || '&mdash;'}</td>
				</tr>`
					)
					.join('')}
			</tbody>
		</table>`
				: ''
		}

		<hr style="border:none;border-top:1px solid #f1f5f9;margin:16px 0;" />
		<p style="color:#94a3b8;font-size:12px;margin:0;">
			BFS Inventory &middot; <a href="${appUrl}" style="color:#94a3b8;">${appUrl}</a>
		</p>
	</div>
</div>
</body>
</html>`;

	await sendMail({ to, subject, html });

	return NextResponse.json({ ok: true });
}
