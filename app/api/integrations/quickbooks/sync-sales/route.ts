import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

/**
 * QB Sales by Product/Service Summary import.
 *
 * QB exports this report in two shapes:
 *
 * Shape A — flat (one row per product per month):
 *   { itemName, sku?, year, month, quantity?, revenue }
 *
 * Shape B — wide (one row per product, columns Jan–Dec):
 *   { itemName, jan?, feb?, ..., dec?, year }
 *   Values are revenue amounts (QB doesn't include unit qty in this report).
 */

const MONTH_COLS = [
	'jan',
	'feb',
	'mar',
	'apr',
	'may',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec',
] as const;

interface FlatRow {
	itemName: string;
	sku?: string;
	year: number | string;
	month: number | string;
	quantity?: number | string;
	revenue: number | string;
}

interface WideRow {
	itemName: string;
	sku?: string;
	year: number | string;
	jan?: number | string;
	feb?: number | string;
	mar?: number | string;
	apr?: number | string;
	may?: number | string;
	jun?: number | string;
	jul?: number | string;
	aug?: number | string;
	sep?: number | string;
	oct?: number | string;
	nov?: number | string;
	dec?: number | string;
}

function isWide(row: FlatRow | WideRow): row is WideRow {
	return MONTH_COLS.some(
		(m) => (row as unknown as Record<string, unknown>)[m] != null
	);
}

function stripQbHierarchy(name: string) {
	const parts = name.split(':');
	return parts[parts.length - 1].trim();
}

async function resolveProduct(itemName: string, sku?: string) {
	const stripped = stripQbHierarchy(itemName);
	return prisma.product.findFirst({
		where: {
			isActive: true,
			OR: [
				...(sku
					? [
							{
								sku: {
									equals: sku.trim(),
									mode: 'insensitive' as const,
								},
							},
						]
					: []),
				...(sku
					? [
							{
								barcode: {
									equals: sku.trim(),
									mode: 'insensitive' as const,
								},
							},
						]
					: []),
				{ name: { equals: stripped, mode: 'insensitive' as const } },
				{
					name: {
						equals: itemName.trim(),
						mode: 'insensitive' as const,
					},
				},
			],
		},
		select: { id: true, name: true },
	});
}

export async function POST(req: NextRequest) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	const body = await req.json();
	const { rows }: { rows: (FlatRow | WideRow)[] } = body;

	if (!Array.isArray(rows) || rows.length === 0) {
		return NextResponse.json({ error: 'rows required' }, { status: 400 });
	}

	let synced = 0,
		skipped = 0;
	const errors: string[] = [];
	const startedAt = new Date();

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (!row.itemName?.trim()) {
			skipped++;
			continue;
		}

		const year = parseInt(String(row.year), 10);
		if (isNaN(year) || year < 2000 || year > 2100) {
			errors.push(`Row ${i + 1}: invalid year "${row.year}"`);
			skipped++;
			continue;
		}

		try {
			const product = await resolveProduct(row.itemName, row.sku);
			if (!product) {
				errors.push(`Not found: "${row.itemName}"`);
				skipped++;
				continue;
			}

			if (isWide(row)) {
				// Wide format: one column per month
				for (let m = 0; m < 12; m++) {
					const colKey = MONTH_COLS[m];
					const raw = (row as unknown as Record<string, unknown>)[
						colKey
					];
					if (raw == null || raw === '') continue;
					const revenue = parseFloat(
						String(raw).replace(/[$,]/g, '')
					);
					if (isNaN(revenue)) continue;

					await prisma.salesRecord.upsert({
						where: {
							productId_year_month: {
								productId: product.id,
								year,
								month: m + 1,
							},
						},
						update: {
							revenue,
							source: 'QB_EXPORT',
							updatedAt: new Date(),
						},
						create: {
							productId: product.id,
							year,
							month: m + 1,
							quantity: 0,
							revenue,
							source: 'QB_EXPORT',
						},
					});
					synced++;
				}
			} else {
				// Flat format: one row per month
				const month = parseInt(String((row as FlatRow).month), 10);
				if (isNaN(month) || month < 1 || month > 12) {
					errors.push(
						`Row ${i + 1}: invalid month "${(row as FlatRow).month}"`
					);
					skipped++;
					continue;
				}

				const revenue =
					parseFloat(
						String((row as FlatRow).revenue).replace(/[$,]/g, '')
					) || 0;
				const quantity =
					(row as FlatRow).quantity != null
						? Math.round(
								parseFloat(String((row as FlatRow).quantity))
							)
						: 0;

				await prisma.salesRecord.upsert({
					where: {
						productId_year_month: {
							productId: product.id,
							year,
							month,
						},
					},
					update: {
						quantity,
						revenue,
						source: 'QB_EXPORT',
						updatedAt: new Date(),
					},
					create: {
						productId: product.id,
						year,
						month,
						quantity,
						revenue,
						source: 'QB_EXPORT',
					},
				});
				synced++;
			}
		} catch (err: unknown) {
			errors.push(
				`Row ${i + 1} "${row.itemName}": ${err instanceof Error ? err.message : String(err)}`
			);
			skipped++;
		}
	}

	await prisma.$transaction([
		prisma.syncLog.create({
			data: {
				provider: 'QUICKBOOKS',
				type: 'SALES_SYNC',
				status:
					errors.length > 0 && synced === 0
						? 'FAILED'
						: errors.length > 0
							? 'PARTIAL'
							: 'SUCCESS',
				message: `${synced} records synced, ${skipped} rows skipped`,
				recordsIn: rows.length,
				recordsOut: synced,
			},
		}),
		prisma.integrationConfig.upsert({
			where: { provider: 'QUICKBOOKS' },
			update: { lastSyncAt: startedAt },
			create: {
				provider: 'QUICKBOOKS',
				config: {},
				isActive: true,
				lastSyncAt: startedAt,
			},
		}),
	]);

	return NextResponse.json({
		synced,
		skipped,
		errors: errors.slice(0, 30),
		total: rows.length,
	});
}
