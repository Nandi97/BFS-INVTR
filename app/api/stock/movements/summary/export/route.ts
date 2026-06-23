import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import ExcelJS from 'exceljs';

const BLACK = 'FF111827';
const WHITE = 'FFFFFFFF';
const STRIPE = 'FFF9FAFB';
const HAIR = 'FFE5E7EB';
const GREEN = 'FF16A34A';
const RED = 'FFDC2626';
const MUTED = 'FF6B7280';

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const locationId = searchParams.get('locationId');
	const brandId = searchParams.get('brandId');
	const dateFrom = searchParams.get('dateFrom');
	const dateTo = searchParams.get('dateTo');

	const conditions: Prisma.Sql[] = [];
	if (locationId)
		conditions.push(Prisma.sql`sm."locationId" = ${locationId}`);
	if (brandId) conditions.push(Prisma.sql`p."brandId" = ${brandId}`);
	if (dateFrom)
		conditions.push(Prisma.sql`sm."createdAt" >= ${new Date(dateFrom)}`);
	if (dateTo)
		conditions.push(
			Prisma.sql`sm."createdAt" <= ${new Date(dateTo + 'T23:59:59Z')}`
		);

	const where =
		conditions.length > 0
			? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
			: Prisma.empty;

	const rows = await prisma.$queryRaw<
		Array<{
			productId: string;
			productName: string;
			brandName: string | null;
			totalOut: number;
			totalIn: number;
			movementCount: bigint;
			lastMovement: Date;
		}>
	>`
    SELECT
      sm."productId",
      p.name                                                          AS "productName",
      b.name                                                          AS "brandName",
      COALESCE(SUM(CASE WHEN sm.type IN (
        'ADJUSTMENT_OUT','SALE','TRANSFER_OUT'
      ) THEN sm.quantity ELSE 0 END), 0)::float                      AS "totalOut",
      COALESCE(SUM(CASE WHEN sm.type IN (
        'PURCHASE_RECEIPT','ADJUSTMENT_IN','TRANSFER_IN'
      ) THEN sm.quantity ELSE 0 END), 0)::float                      AS "totalIn",
      COUNT(*)                                                        AS "movementCount",
      MAX(sm."createdAt")                                             AS "lastMovement"
    FROM "StockMovement" sm
    JOIN "Product"  p ON p.id  = sm."productId"
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    ${where}
    GROUP BY sm."productId", p.name, b.name
    ORDER BY "totalOut" DESC
  `;

	const productIds = rows.map((r) => r.productId);
	const stockRows =
		productIds.length > 0
			? await prisma.inventory.groupBy({
					by: ['productId'],
					where: {
						productId: { in: productIds },
						...(locationId ? { locationId } : {}),
						location: { isActive: true },
					},
					_sum: { quantity: true },
				})
			: [];

	const stockByProduct = new Map(
		stockRows.map((s) => [s.productId, s._sum.quantity ?? 0])
	);

	// ── Build workbook ──────────────────────────────────────────────────────────
	const wb = new ExcelJS.Workbook();
	wb.creator = 'BFS Inventory';
	wb.created = new Date();
	wb.modified = new Date();

	const ws = wb.addWorksheet('Movements Summary', {
		views: [{ state: 'frozen', ySplit: 3 }],
	});

	// ── Meta rows ───────────────────────────────────────────────────────────────
	const periodLabel =
		dateFrom || dateTo
			? `${dateFrom ?? 'all time'} → ${dateTo ?? 'today'}`
			: 'All time';

	const brandRow = ws.addRow([
		'Brand:',
		brandId ? (rows[0]?.brandName ?? '—') : 'All brands',
	]);
	brandRow.getCell(1).font = { bold: true, size: 10 };
	brandRow.getCell(2).font = { size: 10 };

	const periodRow = ws.addRow(['Period:', periodLabel]);
	periodRow.getCell(1).font = { bold: true, size: 10 };
	periodRow.getCell(2).font = { size: 10 };

	ws.addRow([]); // blank spacer before header

	// ── Column header ───────────────────────────────────────────────────────────
	const COLS = [
		{ header: 'Product', key: 'product', width: 40 },
		{ header: 'Brand', key: 'brand', width: 22 },
		{ header: 'Total In', key: 'totalIn', width: 12 },
		{ header: 'Total Out', key: 'totalOut', width: 12 },
		{ header: 'Net Change', key: 'netChange', width: 12 },
		{ header: 'Current Stock', key: 'currentStock', width: 14 },
		{ header: 'Movements', key: 'movements', width: 11 },
		{ header: 'Last Movement', key: 'lastMovement', width: 18 },
	];

	ws.columns = COLS;

	const headerRow = ws.addRow(COLS.map((c) => c.header));
	headerRow.eachCell((cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: BLACK },
		};
		cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
		cell.alignment = { vertical: 'middle', horizontal: 'left' };
		cell.border = {
			bottom: { style: 'thin', color: { argb: 'FF374151' } },
		};
	});
	headerRow.height = 22;

	// ── Data rows ────────────────────────────────────────────────────────────────
	rows.forEach((r, i) => {
		const currentStock = stockByProduct.get(r.productId) ?? 0;
		const totalIn = r.totalIn;
		const totalOut = r.totalOut;
		const netChange = totalIn - totalOut;

		const row = ws.addRow([
			r.productName,
			r.brandName ?? '—',
			totalIn > 0 ? totalIn : null,
			totalOut > 0 ? totalOut : null,
			netChange !== 0 ? netChange : 0,
			currentStock,
			Number(r.movementCount),
			r.lastMovement.toISOString().slice(0, 10),
		]);

		const shade = i % 2 === 1;
		row.eachCell({ includeEmpty: true }, (cell) => {
			if (shade)
				cell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: STRIPE },
				};
			cell.font = { size: 10 };
			cell.alignment = { vertical: 'middle' };
			cell.border = { bottom: { style: 'hair', color: { argb: HAIR } } };
		});

		// Colour Total In green, Total Out red, Net Change conditional
		const inCell = row.getCell(3);
		const outCell = row.getCell(4);
		const netCell = row.getCell(5);

		if (totalIn > 0) inCell.font = { size: 10, color: { argb: GREEN } };
		if (totalOut > 0) outCell.font = { size: 10, color: { argb: RED } };
		netCell.font = {
			size: 10,
			color: {
				argb: netChange < 0 ? RED : netChange > 0 ? GREEN : MUTED,
			},
		};

		row.height = 18;
	});

	// ── Totals row ───────────────────────────────────────────────────────────────
	const totalIn = rows.reduce((s, r) => s + r.totalIn, 0);
	const totalOut = rows.reduce((s, r) => s + r.totalOut, 0);
	const totalStock = [...stockByProduct.values()].reduce((s, v) => s + v, 0);

	const totalsRow = ws.addRow([
		`${rows.length} products`,
		'',
		totalIn > 0 ? totalIn : null,
		totalOut > 0 ? totalOut : null,
		totalIn - totalOut,
		totalStock,
		'',
		'',
	]);
	totalsRow.eachCell({ includeEmpty: true }, (cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: BLACK },
		};
		cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
		cell.border = { top: { style: 'thin', color: { argb: 'FF374151' } } };
	});
	totalsRow.height = 20;

	// ── Stream buffer ────────────────────────────────────────────────────────────
	const raw = await wb.xlsx.writeBuffer();
	const blob = new Blob([raw], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});

	const fromSlug = dateFrom ?? 'all';
	const toSlug = dateTo ?? 'today';
	const filename = `movements-${fromSlug}-${toSlug}.xlsx`;

	return new NextResponse(blob, {
		headers: {
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
}
