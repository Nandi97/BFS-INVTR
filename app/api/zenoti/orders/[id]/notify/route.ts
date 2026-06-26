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

	const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:580px;color:#111;">
	<div style="background:${meta.colour};padding:20px 24px;border-radius:8px 8px 0 0;">
		<h2 style="margin:0;color:#fff;font-size:18px;">${meta.label} — Action Required</h2>
		<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
			Sent by ${auth.user.email} · ${new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
		</p>
	</div>

	<div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px;">
		<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
			<tr>
				<td style="padding:8px 0;font-weight:600;width:120px;color:#6b7280;">Order #</td>
				<td style="padding:8px 0;font-weight:700;font-size:16px;">${order.orderNumber}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Store</td>
				<td style="padding:8px 0;border-top:1px solid #e5e7eb;">${order.centerName}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Organisation</td>
				<td style="padding:8px 0;border-top:1px solid #e5e7eb;">${orgLabel}</td>
			</tr>
			${
				order.supplier
					? `
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Supplier</td>
				<td style="padding:8px 0;border-top:1px solid #e5e7eb;">${order.supplier}</td>
			</tr>`
					: ''
			}
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Items</td>
				<td style="padding:8px 0;border-top:1px solid #e5e7eb;">${order.items.length} line item${order.items.length !== 1 ? 's' : ''}</td>
			</tr>
			${
				order.raisedAt
					? `
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Raised</td>
				<td style="padding:8px 0;border-top:1px solid #e5e7eb;">${new Date(order.raisedAt).toLocaleDateString('en-CA')}</td>
			</tr>`
					: ''
			}
			${
				order.deliverBy
					? `
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Deliver by</td>
				<td style="padding:8px 0;border-top:1px solid #e5e7eb;${new Date(order.deliverBy) < new Date() ? 'color:#dc2626;font-weight:600;' : ''}">${new Date(order.deliverBy).toLocaleDateString('en-CA')}</td>
			</tr>`
					: ''
			}
		</table>

		<p style="margin:0 0 12px;">${meta.actionNote}</p>
		<p style="margin:0 0 20px;">
			<a href="${orderUrl}" style="background:${meta.colour};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">
				View Order →
			</a>
		</p>

		${
			order.items.length > 0
				? `
		<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;">
			<thead>
				<tr style="background:#1e293b;">
					<th style="padding:6px 8px;text-align:left;color:#fff;font-weight:600;">Code</th>
					<th style="padding:6px 8px;text-align:left;color:#fff;font-weight:600;">Product</th>
					<th style="padding:6px 8px;text-align:right;color:#fff;font-weight:600;">Retail</th>
					<th style="padding:6px 8px;text-align:right;color:#fff;font-weight:600;">Consumable</th>
				</tr>
			</thead>
			<tbody>
				${order.items
					.map(
						(item, i) => `
				<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
					<td style="padding:5px 8px;font-family:monospace;color:#64748b;">${item.productCode ?? ''}</td>
					<td style="padding:5px 8px;">${item.productName}</td>
					<td style="padding:5px 8px;text-align:right;">${item.retailRaised || '—'}</td>
					<td style="padding:5px 8px;text-align:right;">${item.consumableRaised || '—'}</td>
				</tr>`
					)
					.join('')}
			</tbody>
		</table>`
				: ''
		}

		<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
		<p style="color:#9ca3af;font-size:12px;margin:0;">
			BFS Inventory · <a href="${appUrl}" style="color:#9ca3af;">${appUrl}</a>
		</p>
	</div>
</div>`;

	await sendMail({ to, subject, html });

	return NextResponse.json({ ok: true });
}
