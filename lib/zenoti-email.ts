import { sendMail } from '@/lib/mailer';
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
	{ label: string; to: string; actionNote: string; colour: string }
> = {
	WAREHOUSE: {
		label: 'Warehouse Order',
		to: 'order@beautylogix.ca',
		actionNote:
			'This order requires warehouse packing. Open BFS Inventory to start packing:',
		colour: '#16a34a',
	},
	COSTCO: {
		label: 'Costco Order',
		to: 'order@beautylogix.ca',
		actionNote:
			'This Costco order has been imported for visibility. Accounting handles fulfillment directly.',
		colour: '#2563eb',
	},
	INVERNESS: {
		label: 'Inverness Order',
		to: 'order@beautylogix.ca',
		actionNote:
			'This Inverness order has been imported for visibility. Accounting handles fulfillment directly.',
		colour: '#7c3aed',
	},
	OTHER: {
		label: 'External Order',
		to: 'order@beautylogix.ca',
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
	const orgLabel = ORG_LABELS[org] ?? org.toUpperCase();
	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL ?? 'https://bfs.kigtech.digital';

	const subject = `[BFS] ${meta.label} #${result.orderNumber} — ${result.centerName} · ${result.itemCount} items`;

	const unmatchedNote =
		result.unmatchedCodes.length > 0
			? `<p style="color:#d97706;font-size:13px;padding:10px 14px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px;">
				⚠ ${result.unmatchedCodes.length} product code(s) not matched to BFS catalog —
				they will show as unmatched items during packing:<br/>
				<code style="font-size:12px;">${result.unmatchedCodes.join(', ')}</code>
			</p>`
			: '';

	const actionBlock =
		type === 'WAREHOUSE'
			? `<p style="margin:16px 0 8px;">${meta.actionNote}</p>
			   <p><a href="${appUrl}/zenoti" style="background:${meta.colour};color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">Open Procurement Orders →</a></p>`
			: `<p style="margin:16px 0 8px;">${meta.actionNote}</p>`;

	const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:580px;color:#111;">
	<div style="background:${meta.colour};padding:20px 24px;border-radius:8px 8px 0 0;">
		<h2 style="margin:0;color:#fff;font-size:18px;">${meta.label} Received</h2>
		<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
			Imported ${new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
		</p>
	</div>

	<div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px;">
		<table style="width:100%;border-collapse:collapse;font-size:14px;">
			<tr>
				<td style="padding:8px 0;font-weight:600;width:120px;color:#6b7280;">Order #</td>
				<td style="padding:8px 0;font-weight:700;font-size:16px;">${result.orderNumber}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Store</td>
				<td style="padding:8px 0;border-top:1px solid #e5e7eb;">${result.centerName}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Supplier</td>
				<td style="padding:8px 0;border-top:1px solid #e5e7eb;">${result.supplier || '—'}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Organisation</td>
				<td style="padding:8px 0;border-top:1px solid #e5e7eb;">${orgLabel}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Line items</td>
				<td style="padding:8px 0;border-top:1px solid #e5e7eb;">
					${result.itemCount} item${result.itemCount !== 1 ? 's' : ''}
					· ${result.matchedProducts} matched to BFS catalog
				</td>
			</tr>
		</table>

		${actionBlock}
		${unmatchedNote}

		<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
		<p style="color:#9ca3af;font-size:12px;margin:0;">
			BFS Inventory · <a href="${appUrl}" style="color:#9ca3af;">${appUrl}</a>
		</p>
	</div>
</div>`;

	await sendMail({ to: meta.to, subject, html });
}
