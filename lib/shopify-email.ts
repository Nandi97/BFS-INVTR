import { sendMail } from '@/lib/mailer';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import type { ShopifyApiOrder } from '@/lib/shopify';
import { customerName } from '@/lib/shopify';

const NOTIFY_TO_KEY = 'shopify_order_notify_to';
const NOTIFY_CC_KEY = 'shopify_order_notify_cc';

function buildHtml(
	orders: { storeDomain: string; order: ShopifyApiOrder }[]
): string {
	const headerBg = '#059669'; // emerald — distinct from Zenoti purple

	const rows = orders
		.map(({ storeDomain, order }) => {
			const name = customerName(order);
			const items = order.line_items
				.map(
					(li) =>
						`${li.title}${li.variant_title ? ` — ${li.variant_title}` : ''} × ${li.quantity}`
				)
				.join('<br/>');
			const total = `${order.currency} $${parseFloat(order.total_price).toFixed(2)}`;
			const store = storeDomain.replace('.myshopify.com', '');

			return `<tr>
        <td><strong>${order.name}</strong></td>
        <td>${store}</td>
        <td>${name}</td>
        <td style="font-size:12px;color:#475569">${items}</td>
        <td style="font-family:'Courier New',monospace;white-space:nowrap">${total}</td>
        <td>
          <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${order.financial_status === 'paid' ? '#dcfce7' : '#fef3c7'};color:${order.financial_status === 'paid' ? '#15803d' : '#92400e'};font-size:11px;font-weight:600">
            ${order.financial_status}
          </span>
        </td>
      </tr>`;
		})
		.join('');

	const appUrl = process.env.NEXT_PUBLIC_APP_URL;
	const dateStr = format(new Date(), 'MMMM d, yyyy · h:mm a');

	const body = `
    <h2 style="font-size:16px;font-weight:600;margin:0 0 8px;color:#0f172a">
      ${orders.length} new Shopify order${orders.length !== 1 ? 's' : ''} received
    </h2>
    <p style="font-size:13px;color:#64748b;margin:0 0 20px">${dateStr}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Order</th>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Store</th>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Customer</th>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Items</th>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Total</th>
          <th style="text-align:left;padding:8px 10px;background:#f8fafc;font-weight:600;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0">Payment</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <a href="${appUrl}/shopify"
       style="display:inline-block;margin-top:20px;padding:10px 22px;background:${headerBg};color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">
      View Orders in BFS &rarr;
    </a>`;

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>New Shopify Orders</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;margin:0;padding:24px;color:#0f172a">
<div style="background:#fff;border-radius:10px;max-width:760px;margin:0 auto;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.10)">
  <div style="background:${headerBg};color:#fff;padding:24px 32px">
    <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">BFS Inventory</p>
    <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8)">New Shopify Orders</p>
  </div>
  <div style="padding:28px 32px">${body}</div>
  <div style="padding:16px 32px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8">
    Beauty First / Beauty Logix &middot; Automated notification from BFS Inventory
  </div>
</div>
</body>
</html>`;
}

export async function sendShopifyNewOrdersEmail(
	orders: { storeDomain: string; order: ShopifyApiOrder }[]
): Promise<void> {
	if (orders.length === 0) return;

	const settings = await prisma.appSetting.findMany({
		where: { key: { in: [NOTIFY_TO_KEY, NOTIFY_CC_KEY] } },
	});

	const toSetting =
		settings.find((s) => s.key === NOTIFY_TO_KEY)?.value ?? '';
	const ccSetting =
		settings.find((s) => s.key === NOTIFY_CC_KEY)?.value ?? '';

	if (!toSetting) return;

	const ccList = ccSetting
		? ccSetting
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
		: [];

	await sendMail({
		to: toSetting,
		cc: ccList.length ? ccList : undefined,
		subject: `${orders.length} new Shopify order${orders.length !== 1 ? 's' : ''} — ${format(new Date(), 'MMM d, yyyy')}`,
		html: buildHtml(orders),
	});
}
