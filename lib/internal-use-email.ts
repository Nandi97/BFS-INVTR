import { sendMail } from '@/lib/mailer';
import { format } from 'date-fns';

export interface InternalUseLineItem {
	productName: string;
	brandName: string | null;
	sku: string | null;
	locationName: string;
	quantity: number;
	reason: string;
	notes: string | null;
}

export interface SendInternalUseSlipOptions {
	items: InternalUseLineItem[];
	recipientEmail: string | null;
	submittedByName: string;
	cc: string;
	date: Date;
}

function buildHtml(opts: SendInternalUseSlipOptions): string {
	const dateStr = format(opts.date, 'MMMM d, yyyy · h:mm a');
	const headerBg = '#7c3aed';

	const rows = opts.items
		.map(
			(item) => `<tr>
      <td>
        <strong>${item.productName}</strong>
        ${item.brandName ? `<br/><span style="color:#64748b;font-size:11px">${item.brandName}</span>` : ''}
      </td>
      <td style="font-family:'Courier New',monospace">${item.sku ?? '—'}</td>
      <td>${item.locationName}</td>
      <td style="font-family:'Courier New',monospace;text-align:right">${item.quantity}</td>
      <td>${item.reason}</td>
      <td style="color:#64748b">${item.notes ?? '—'}</td>
    </tr>`
		)
		.join('');

	const body = `
    <h2 style="font-size:16px;font-weight:600;margin:0 0 8px;color:#0f172a">
      Internal Use Slip
    </h2>
    <p style="font-size:14px;color:#334155;margin:0 0 20px">
      <strong>Submitted by:</strong> ${opts.submittedByName}<br/>
      <strong>Date:</strong> ${dateStr}<br/>
      <strong>Items:</strong> ${opts.items.length}
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Product</th>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">SKU</th>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Location</th>
          <th style="text-align:right;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Qty</th>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Reason</th>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/stock/internal-use"
       style="display:inline-block;margin-top:20px;padding:10px 22px;background:${headerBg};color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">
      View Internal Use Log &rarr;
    </a>`;

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Internal Use Slip</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:24px;color:#0f172a">
<div style="background:#fff;border-radius:10px;max-width:720px;margin:0 auto;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.10)">
  <div style="background:${headerBg};color:#fff;padding:24px 32px">
    <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">BFS Inventory</p>
    <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8)">Internal Use Slip</p>
  </div>
  <div style="padding:28px 32px">${body}</div>
  <div style="padding:16px 32px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8">
    Beauty First / Beauty Logix &middot; Automated slip from BFS Inventory
  </div>
</div>
</body>
</html>`;
}

export async function sendInternalUseSlip(
	opts: SendInternalUseSlipOptions
): Promise<void> {
	const ccList = opts.cc
		? opts.cc
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
		: [];

	const toAddresses = opts.recipientEmail
		? [opts.recipientEmail]
		: ccList.length > 0
			? [ccList[0]]
			: [];

	if (toAddresses.length === 0) return;

	const ccAddresses = opts.recipientEmail ? ccList : ccList.slice(1);

	await sendMail({
		to: toAddresses,
		cc: ccAddresses.length ? ccAddresses : undefined,
		subject: `Internal Use Slip — ${format(opts.date, 'MMM d, yyyy')}`,
		html: buildHtml(opts),
	});
}
