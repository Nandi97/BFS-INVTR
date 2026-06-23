export interface StockAlertItem {
	name: string;
	brand?: string;
	sku?: string;
	location: string;
	quantity: number;
	reorderPoint?: number;
	suggestedQty?: number;
}

function base(title: string, body: string) {
	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f8f8; margin: 0; padding: 24px; color: #111; }
  .card { background: #fff; border-radius: 10px; max-width: 680px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .header { background: #111; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
  .header p  { margin: 4px 0 0; font-size: 13px; color: #999; }
  .body { padding: 28px 32px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 10px; background: #f3f3f3; font-weight: 600; color: #555; }
  td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .tag-red  { display:inline-block; padding: 2px 8px; border-radius: 999px; background:#fee2e2; color:#dc2626; font-size:11px; font-weight:600; }
  .tag-amber{ display:inline-block; padding: 2px 8px; border-radius: 999px; background:#fef3c7; color:#d97706; font-size:11px; font-weight:600; }
  .num { font-family: monospace; }
  .footer { padding: 16px 32px; border-top: 1px solid #f0f0f0; font-size: 11px; color: #aaa; }
  h2 { font-size: 16px; font-weight: 600; margin: 0 0 16px; }
  p  { font-size: 14px; line-height: 1.6; color: #444; }
  .btn { display:inline-block; margin-top:16px; padding:10px 20px; background:#111; color:#fff; border-radius:8px; text-decoration:none; font-size:13px; font-weight:600; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>BFS Inventory</h1>
    <p>${title}</p>
  </div>
  <div class="body">${body}</div>
  <div class="footer">Beauty First / Beauty Logix · Automated alert from BFS Inventory</div>
</div>
</body>
</html>`;
}

export function outOfStockTemplate(items: StockAlertItem[]) {
	const rows = items
		.map(
			(i) => `<tr>
        <td><strong>${i.name}</strong>${i.brand ? `<br/><span style="color:#888;font-size:11px">${i.brand}</span>` : ''}</td>
        <td>${i.sku ?? '—'}</td>
        <td>${i.location}</td>
        <td class="num"><span class="tag-red">${i.quantity}</span></td>
        <td class="num">${i.suggestedQty ?? '—'}</td>
      </tr>`
		)
		.join('');

	return base(
		'Out of Stock Alert',
		`<h2>⚠️ ${items.length} product${items.length !== 1 ? 's' : ''} out of stock</h2>
    <p>The following products have zero or negative inventory and need immediate attention.</p>
    <table>
      <thead><tr><th>Product</th><th>SKU</th><th>Location</th><th>Qty</th><th>Suggest Order</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL}/reorder">View Reorder Page →</a>`
	);
}

export function lowStockTemplate(items: StockAlertItem[]) {
	const rows = items
		.map(
			(i) => `<tr>
        <td><strong>${i.name}</strong>${i.brand ? `<br/><span style="color:#888;font-size:11px">${i.brand}</span>` : ''}</td>
        <td>${i.sku ?? '—'}</td>
        <td>${i.location}</td>
        <td class="num"><span class="tag-amber">${i.quantity}</span></td>
        <td class="num">${i.reorderPoint ?? '—'}</td>
        <td class="num">${i.suggestedQty ?? '—'}</td>
      </tr>`
		)
		.join('');

	return base(
		'Low Stock Alert',
		`<h2>📦 ${items.length} product${items.length !== 1 ? 's' : ''} running low</h2>
    <p>These products are at or below their reorder point and should be ordered soon.</p>
    <table>
      <thead><tr><th>Product</th><th>SKU</th><th>Location</th><th>Qty</th><th>Reorder At</th><th>Suggest Order</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL}/reorder">View Reorder Page →</a>`
	);
}

export function reorderNeededTemplate(
	outItems: StockAlertItem[],
	lowItems: StockAlertItem[]
) {
	const outRows = outItems
		.map(
			(i) => `<tr>
        <td><strong>${i.name}</strong>${i.brand ? `<br/><span style="color:#888;font-size:11px">${i.brand}</span>` : ''}</td>
        <td>${i.location}</td>
        <td class="num"><span class="tag-red">${i.quantity}</span></td>
        <td class="num">${i.suggestedQty ?? '—'}</td>
      </tr>`
		)
		.join('');

	const lowRows = lowItems
		.map(
			(i) => `<tr>
        <td><strong>${i.name}</strong>${i.brand ? `<br/><span style="color:#888;font-size:11px">${i.brand}</span>` : ''}</td>
        <td>${i.location}</td>
        <td class="num"><span class="tag-amber">${i.quantity}</span></td>
        <td class="num">${i.suggestedQty ?? '—'}</td>
      </tr>`
		)
		.join('');

	const outSection =
		outItems.length > 0
			? `<h2 style="color:#dc2626">🚨 Out of Stock (${outItems.length})</h2>
       <table><thead><tr><th>Product</th><th>Location</th><th>Qty</th><th>Suggest Order</th></tr></thead><tbody>${outRows}</tbody></table>`
			: '';

	const lowSection =
		lowItems.length > 0
			? `<h2 style="margin-top:24px">⚠️ Low Stock (${lowItems.length})</h2>
       <table><thead><tr><th>Product</th><th>Location</th><th>Qty</th><th>Suggest Order</th></tr></thead><tbody>${lowRows}</tbody></table>`
			: '';

	return base(
		'Reorder Needed',
		`<p style="margin-bottom:20px">The following products need to be ordered. Please review and create purchase orders as needed.</p>
    ${outSection}${lowSection}
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL}/reorder">Open Reorder Page →</a>`
	);
}

export function dailyDigestTemplate(stats: {
	totalProducts: number;
	outOfStock: number;
	lowStock: number;
	healthyStock: number;
	recentMovements: {
		product: string;
		type: string;
		qty: number;
		location: string;
	}[];
}) {
	const movementRows = stats.recentMovements
		.slice(0, 10)
		.map(
			(m) => `<tr>
        <td>${m.product}</td>
        <td>${m.type.replace(/_/g, ' ')}</td>
        <td class="num">${m.qty > 0 ? '+' : ''}${m.qty}</td>
        <td>${m.location}</td>
      </tr>`
		)
		.join('');

	return base(
		'Daily Inventory Digest',
		`<h2>Daily Stock Summary</h2>
    <table style="margin-bottom:24px">
      <tr><th>Metric</th><th>Count</th></tr>
      <tr><td>Total Products Tracked</td><td class="num">${stats.totalProducts}</td></tr>
      <tr><td>Out of Stock</td><td class="num"><span class="tag-red">${stats.outOfStock}</span></td></tr>
      <tr><td>Low Stock</td><td class="num"><span class="tag-amber">${stats.lowStock}</span></td></tr>
      <tr><td>Healthy Stock</td><td class="num">${stats.healthyStock}</td></tr>
    </table>
    ${
		stats.recentMovements.length > 0
			? `
    <h2>Recent Movements</h2>
    <table>
      <thead><tr><th>Product</th><th>Type</th><th>Qty</th><th>Location</th></tr></thead>
      <tbody>${movementRows}</tbody>
    </table>`
			: ''
	}
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Open Dashboard →</a>`
	);
}

export function testEmailTemplate(recipient: string) {
	return base(
		'Test Email',
		`<h2>✅ Email notifications are working</h2>
    <p>This is a test email from BFS Inventory sent to <strong>${recipient}</strong>.</p>
    <p>Your Gmail SMTP configuration is correctly set up. You will receive real alerts when stock levels trigger your configured rules.</p>
    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL}/notifications">Manage Alert Rules →</a>`
	);
}
