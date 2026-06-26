import { sendMail } from '@/lib/mailer';
import { getEmailRecipients } from '@/lib/email-recipients';
import type { UpsertResult } from '@/lib/zenoti-excel';

export type SupplierType = 'WAREHOUSE' | 'COSTCO' | 'INVERNESS' | 'OTHER';

export function getSupplierType(
	supplier: string | null | undefined
): SupplierType {
	const s = (supplier ?? '').toLowerCase();
	if (s.includes('beauty logix')) return 'WAREHOUSE';
	if (s.includes('costco')) return 'COSTCO';
	if (s.includes('inverness')) return 'INVERNESS';
	return 'OTHER';
}

const TYPE_META: Record<
	SupplierType,
	{ label: string; settingKey: string; actionNote: string; colour: string }
> = {
	WAREHOUSE: {
		label: 'Warehouse Order',
		settingKey: 'zenoti_email_warehouse',
		actionNote:
			'This order requires warehouse packing. Open BFS Inventory to start packing:',
		colour: '#16a34a',
	},
	COSTCO: {
		label: 'Costco Order',
		settingKey: 'zenoti_email_costco',
		actionNote:
			'This Costco order has been imported for visibility. Accounting handles fulfillment directly.',
		colour: '#2563eb',
	},
	INVERNESS: {
		label: 'Inverness Order',
		settingKey: 'zenoti_email_inverness',
		actionNote:
			'This Inverness order has been imported for visibility. Accounting handles fulfillment directly.',
		colour: '#7c3aed',
	},
	OTHER: {
		label: 'External Order',
		settingKey: 'zenoti_email_other',
		actionNote:
			'This order has been imported for visibility. Please review and action accordingly.',
		colour: '#6b7280',
	},
};

const ORG_LABELS: Record<string, string> = {
	bfs: 'Beauty First Spa',
	bl: 'Beauty Logix',
};

export async function sendZenotiImportEmail(
	result: UpsertResult,
	org: string
): Promise<void> {
	const type = getSupplierType(result.supplier);
	const meta = TYPE_META[type];
	const recipients = await getEmailRecipients();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const to = (recipients as any)[meta.settingKey] as string;

	const orgLabel = ORG_LABELS[org] ?? org.toUpperCase();
	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL ?? 'https://bfs.kigtech.digital';

	const subject = `[BFS] ${meta.label} #${result.orderNumber} — ${result.centerName} · ${result.itemCount} items`;

	const unmatchedNote =
		result.unmatchedCodes.length > 0
			? `<p style="color:#92400e;font-size:13px;padding:10px 14px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;">
				<strong>${result.unmatchedCodes.length} product code(s) not matched</strong> to BFS catalog &mdash;
				they will show as unmatched items during packing:<br/>
				<code style="font-size:12px;color:#78350f;">${result.unmatchedCodes.join(', ')}</code>
			</p>`
			: '';

	const actionBlock =
		type === 'WAREHOUSE'
			? `<p style="margin:16px 0 8px;">${meta.actionNote}</p>
			   <p><a href="${appUrl}/zenoti" style="background:${meta.colour};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">Open Procurement Orders →</a></p>`
			: `<p style="margin:16px 0 8px;">${meta.actionNote}</p>`;

	const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:580px;margin:0 auto;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.10);">
	<div style="background:${meta.colour};padding:20px 24px;">
		<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">${meta.label} Received</h2>
		<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
			Imported ${new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
		</p>
	</div>

	<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:20px 24px;">
		<table style="width:100%;border-collapse:collapse;font-size:14px;">
			<tr>
				<td style="padding:8px 0;font-weight:600;width:130px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;">Order #</td>
				<td style="padding:8px 0;font-weight:700;font-size:16px;color:#0f172a;">${result.orderNumber}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;border-top:1px solid #f1f5f9;">Store</td>
				<td style="padding:8px 0;border-top:1px solid #f1f5f9;color:#1e293b;">${result.centerName}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;border-top:1px solid #f1f5f9;">Supplier</td>
				<td style="padding:8px 0;border-top:1px solid #f1f5f9;color:#1e293b;">${result.supplier || '&mdash;'}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;border-top:1px solid #f1f5f9;">Organisation</td>
				<td style="padding:8px 0;border-top:1px solid #f1f5f9;color:#1e293b;">${orgLabel}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;border-top:1px solid #f1f5f9;">Line items</td>
				<td style="padding:8px 0;border-top:1px solid #f1f5f9;color:#1e293b;">
					${result.itemCount} item${result.itemCount !== 1 ? 's' : ''}
					&middot; ${result.matchedProducts} matched to BFS catalog
				</td>
			</tr>
		</table>

		${actionBlock}
		${unmatchedNote}

		<hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0;" />
		<p style="color:#94a3b8;font-size:12px;margin:0;">
			BFS Inventory &middot; <a href="${appUrl}" style="color:#94a3b8;">${appUrl}</a>
		</p>
	</div>
</div>
</body>
</html>`;

	await sendMail({ to, subject, html });
}
