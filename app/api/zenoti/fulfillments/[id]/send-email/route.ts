import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { sendMail } from '@/lib/mailer';
import ExcelJS from 'exceljs';
import { generatePackingSlipPdf } from '@/lib/packing-slip-pdf';
import { getEmailRecipients } from '@/lib/email-recipients';

async function buildPackingListXlsx(params: {
	orderNumber: string;
	centerName: string;
	org: string;
	raisedAt: Date | null;
	deliverBy: Date | null;
	items: Array<{
		productCode: string | null;
		productName: string;
		requestedRetailQty: number;
		requestedConsumableQty: number;
		fulfilledRetailQty: number;
		fulfilledConsumableQty: number;
		notes: string | null;
		isWalkIn: boolean;
	}>;
}): Promise<Buffer> {
	const wb = new ExcelJS.Workbook();
	wb.creator = 'BFS Inventory';
	wb.created = new Date();
	const ws = wb.addWorksheet('Packing List');

	const titleRow = ws.addRow([
		`PACKING LIST — ${params.centerName.toUpperCase()}`,
	]);
	titleRow.getCell(1).font = { bold: true, size: 14 };
	ws.addRow([
		`Order #${params.orderNumber} · ${params.org === 'bfs' ? 'Beauty First Spa' : 'Beauty Logix'}`,
	]);
	ws.addRow([
		`Raised: ${params.raisedAt ? new Date(params.raisedAt).toLocaleDateString('en-CA') : '—'}  ·  Deliver by: ${params.deliverBy ? new Date(params.deliverBy).toLocaleDateString('en-CA') : '—'}  ·  Packed: ${new Date().toLocaleDateString('en-CA')}`,
	]);
	ws.addRow([]);

	ws.columns = [
		{ key: 'code', width: 16 },
		{ key: 'name', width: 40 },
		{ key: 'reqRetail', width: 14 },
		{ key: 'reqCons', width: 14 },
		{ key: 'filRetail', width: 14 },
		{ key: 'filCons', width: 14 },
		{ key: 'flag', width: 12 },
		{ key: 'notes', width: 24 },
	];

	const headerRow = ws.addRow([
		'Product Code',
		'Product Name',
		'Req Retail',
		'Req Consumable',
		'Filled Retail',
		'Filled Consumable',
		'Type',
		'Notes',
	]);
	headerRow.eachCell((cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF111111' },
		};
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
		cell.alignment = { vertical: 'middle', horizontal: 'left' };
	});
	headerRow.height = 20;
	ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }];

	params.items.forEach((item, i) => {
		const shortfallRetail =
			item.fulfilledRetailQty < item.requestedRetailQty;
		const shortfallCons =
			item.fulfilledConsumableQty < item.requestedConsumableQty;
		const shade = i % 2 === 0;

		const r = ws.addRow([
			item.productCode ?? '',
			item.productName,
			item.requestedRetailQty || '',
			item.requestedConsumableQty || '',
			item.fulfilledRetailQty || '',
			item.fulfilledConsumableQty || '',
			item.isWalkIn ? 'Walk-in' : '',
			item.notes ?? '',
		]);

		r.eachCell({ includeEmpty: true }, (cell) => {
			if (shade)
				cell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: 'FFF9FAFB' },
				};
			cell.font = { size: 10 };
			cell.alignment = { vertical: 'middle' };
		});

		if (shortfallRetail)
			r.getCell(5).font = {
				bold: true,
				color: { argb: 'FFEF4444' },
				size: 10,
			};
		if (shortfallCons)
			r.getCell(6).font = {
				bold: true,
				color: { argb: 'FFEF4444' },
				size: 10,
			};
		if (item.isWalkIn)
			r.getCell(7).font = {
				color: { argb: 'FF8B5CF6' },
				italic: true,
				size: 10,
			};
		r.height = 18;
	});

	const buf = await wb.xlsx.writeBuffer();
	return Buffer.from(buf);
}

export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;

	const fulfillment = await prisma.bfsFulfillment.findUnique({
		where: { id },
		include: { items: true, order: true },
	});

	if (!fulfillment)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const { order } = fulfillment;
	const orgLabel = order.org === 'bfs' ? 'Beauty First Spa' : 'Beauty Logix';

	const [recipients, [xlsx, pdf]] = await Promise.all([
		getEmailRecipients(),
		Promise.all([
			buildPackingListXlsx({
				orderNumber: order.orderNumber,
				centerName: order.centerName,
				org: order.org,
				raisedAt: order.raisedAt,
				deliverBy: order.deliverBy,
				items: fulfillment.items,
			}),
			generatePackingSlipPdf({
				orderNumber: order.orderNumber,
				centerName: order.centerName,
				org: order.org,
				supplier: order.supplier,
				raisedAt: order.raisedAt,
				deliverBy: order.deliverBy,
				packedAt: fulfillment.submittedAt ?? new Date(),
				packedBy: fulfillment.submittedBy ?? auth.user.email,
				items: fulfillment.items,
			}),
		]),
	]);

	const totalRetail = fulfillment.items.reduce(
		(s, i) => s + i.fulfilledRetailQty,
		0
	);
	const totalConsumable = fulfillment.items.reduce(
		(s, i) => s + i.fulfilledConsumableQty,
		0
	);
	const walkInCount = fulfillment.items.filter((i) => i.isWalkIn).length;
	const dateStr = new Date().toLocaleDateString('en-CA');

	const subject = `Packing List — ${order.centerName} — Order #${order.orderNumber}`;

	const labelStyle =
		'padding:8px 0;font-weight:600;width:150px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;';
	const valStyle = 'padding:8px 0;color:#1e293b;';
	const rowBorder = 'border-top:1px solid #f1f5f9;';
	const appUrl =
		process.env.NEXT_PUBLIC_APP_URL ?? 'https://bfs.kigtech.digital';

	const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:580px;margin:0 auto;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.10);">
	<div style="background:#d4006e;padding:20px 24px;">
		<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">Packing List</h2>
		<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
			Packed ${dateStr} &middot; ${orgLabel}
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
				<td style="${labelStyle}${rowBorder}">Packed on</td>
				<td style="${valStyle}${rowBorder}">${dateStr}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Retail units</td>
				<td style="${valStyle}${rowBorder}">${totalRetail}</td>
			</tr>
			<tr>
				<td style="${labelStyle}${rowBorder}">Consumable units</td>
				<td style="${valStyle}${rowBorder}">${totalConsumable}</td>
			</tr>
			${
				walkInCount > 0
					? `<tr>
				<td style="${labelStyle}${rowBorder}">Walk-in additions</td>
				<td style="${valStyle}${rowBorder}">${walkInCount} item${walkInCount !== 1 ? 's' : ''}</td>
			</tr>`
					: ''
			}
		</table>

		<p style="font-size:14px;color:#334155;margin:0 0 16px;">
			The PDF packing slip and Excel packing list are attached. Please create the corresponding invoice in QuickBooks.
		</p>

		<p style="margin:0 0 20px;">
			<a href="${appUrl}/zenoti/${order.id}" style="background:#d4006e;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:13px;">
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

	const baseFilename = `packing-slip-${order.centerName.toLowerCase().replace(/\s+/g, '-')}-${order.orderNumber}`;

	await sendMail({
		to: recipients.zenoti_email_packing_list_to,
		...(recipients.zenoti_email_packing_list_cc
			? { cc: recipients.zenoti_email_packing_list_cc }
			: {}),
		subject,
		html,
		attachments: [
			{
				filename: `${baseFilename}.pdf`,
				content: pdf,
				contentType: 'application/pdf',
			},
			{
				filename: `${baseFilename}.xlsx`,
				content: xlsx,
				contentType:
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			},
		],
	});

	return NextResponse.json({ ok: true });
}
