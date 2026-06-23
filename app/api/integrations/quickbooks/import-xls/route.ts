import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

// ── Local drop-folder (dev only) ──────────────────────────────────────────────
const IMPORTS_DIR = path.join(process.cwd(), 'qb-imports');

function findLatestLocalFile(): string | null {
	if (!fs.existsSync(IMPORTS_DIR)) return null;
	const files = fs
		.readdirSync(IMPORTS_DIR)
		.filter(
			(f) =>
				f.startsWith('ProductServiceList') &&
				(f.endsWith('.xls') || f.endsWith('.xlsx'))
		)
		.sort()
		.reverse();
	return files.length ? path.join(IMPORTS_DIR, files[0]) : null;
}

export async function GET() {
	const filePath = findLatestLocalFile();
	return NextResponse.json({
		file: filePath ? path.basename(filePath) : null,
		dir: IMPORTS_DIR,
	});
}

// ── Shared helpers ────────────────────────────────────────────────────────────

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

function parseWorkbook(wb: XLSX.WorkBook) {
	const ws = wb.Sheets[wb.SheetNames[0]];
	const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

	const parsed: {
		itemName: string;
		sku?: string;
		qty: number;
		reorderPoint?: number;
	}[] = [];
	for (const r of rawRows.slice(1)) {
		const row = r as unknown[];
		const itemType = String(row[3] ?? '')
			.trim()
			.toLowerCase();
		if (itemType !== 'inventory') continue;

		const itemName = String(row[0] ?? '').trim();
		if (!itemName) continue;

		const sku = String(row[2] ?? '').trim() || undefined;
		const qty = Math.max(0, parseFloat(String(row[13] ?? '0')) || 0);
		const rpRaw = parseFloat(String(row[14] ?? ''));
		const reorderPoint = isNaN(rpRaw) ? undefined : Math.max(0, rpRaw);

		parsed.push({ itemName, sku, qty, reorderPoint });
	}
	return parsed;
}

async function syncParsedRows(
	parsed: ReturnType<typeof parseWorkbook>,
	locationName: string,
	fileName: string
) {
	const loc = await prisma.location.findFirst({
		where: {
			isActive: true,
			OR: [
				{ name: { equals: locationName.trim(), mode: 'insensitive' } },
				{ code: { equals: locationName.trim(), mode: 'insensitive' } },
			],
		},
		select: { id: true },
	});
	if (!loc) throw new Error(`Location "${locationName}" not found`);

	let synced = 0,
		skipped = 0;
	const errors: string[] = [];
	const startedAt = new Date();

	for (const row of parsed) {
		try {
			const product = await resolveProduct(row.itemName, row.sku);
			if (!product) {
				errors.push(`Not found: "${row.itemName}"`);
				skipped++;
				continue;
			}

			await prisma.$transaction(async (tx) => {
				await tx.inventory.upsert({
					where: {
						productId_locationId: {
							productId: product.id,
							locationId: loc.id,
						},
					},
					update: {
						quantity: row.qty,
						...(row.reorderPoint != null
							? { reorderPoint: row.reorderPoint }
							: {}),
					},
					create: {
						productId: product.id,
						locationId: loc.id,
						quantity: row.qty,
						reorderPoint: row.reorderPoint ?? 0,
						reorderQty: 0,
						minQuantity: 0,
					},
				});
				await tx.stockMovement.create({
					data: {
						productId: product.id,
						locationId: loc.id,
						type: 'RECONCILIATION',
						quantity: row.qty,
						balanceAfter: row.qty,
						notes: `QB XLS import — ${fileName}`,
					},
				});
			});
			synced++;
		} catch (err: unknown) {
			errors.push(
				`"${row.itemName}": ${err instanceof Error ? err.message : String(err)}`
			);
			skipped++;
		}
	}

	await prisma.$transaction([
		prisma.syncLog.create({
			data: {
				provider: 'QUICKBOOKS',
				type: 'STOCK_SYNC',
				status:
					errors.length > 0 && synced === 0
						? 'FAILED'
						: errors.length > 0
							? 'PARTIAL'
							: 'SUCCESS',
				message: `XLS import: ${synced} synced, ${skipped} skipped — ${fileName}`,
				recordsIn: parsed.length,
				recordsOut: synced,
			},
		}),
		prisma.integrationConfig.upsert({
			where: { provider: 'QUICKBOOKS' },
			update: { lastSyncAt: startedAt },
			create: {
				provider: 'QUICKBOOKS',
				config: { defaultLocation: locationName },
				isActive: true,
				lastSyncAt: startedAt,
			},
		}),
	]);

	return {
		total: parsed.length,
		synced,
		skipped,
		errors: errors.slice(0, 30),
	};
}

// ── POST — accepts either a fileUrl (UploadThing) or falls back to local folder ─

export async function POST(req: NextRequest) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	const body: { location?: string; fileUrl?: string; fileName?: string } =
		await req.json().catch(() => ({}));

	const locationName = body.location ?? 'BF Warehouse';

	let wb: XLSX.WorkBook;
	let fileName: string;

	if (body.fileUrl) {
		// Uploaded via UploadThing — fetch the file from the CDN URL
		const res = await fetch(body.fileUrl);
		if (!res.ok) {
			return NextResponse.json(
				{ error: `Failed to fetch uploaded file: ${res.status}` },
				{ status: 502 }
			);
		}
		const buffer = await res.arrayBuffer();
		wb = XLSX.read(buffer, { type: 'array' });
		fileName = body.fileName ?? 'uploaded.xls';
	} else {
		// Fall back to local drop folder (dev convenience)
		const filePath = findLatestLocalFile();
		if (!filePath) {
			return NextResponse.json(
				{
					error: `No ProductServiceList*.xls in qb-imports/ and no fileUrl provided`,
				},
				{ status: 404 }
			);
		}
		wb = XLSX.readFile(filePath, { type: 'file' });
		fileName = path.basename(filePath);
	}

	const parsed = parseWorkbook(wb);
	if (parsed.length === 0) {
		return NextResponse.json(
			{ error: 'No inventory rows found in file' },
			{ status: 422 }
		);
	}

	try {
		const result = await syncParsedRows(parsed, locationName, fileName);
		return NextResponse.json({ file: fileName, ...result });
	} catch (err: unknown) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : String(err) },
			{ status: 422 }
		);
	}
}
