import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import type { ZenotiOrderStatus } from '@/generated/prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedOrder {
	orderNumber: string;
	status: ZenotiOrderStatus;
	raisedAt: Date | null;
	supplier: string;
	centerName: string;
	items: ParsedItem[];
}

export interface ParsedItem {
	productCode: string;
	productName: string;
	retailRaised: number;
	consumableRaised: number;
	unitPrice: number | null;
}

export interface UpsertResult {
	action: 'created' | 'updated' | 'skipped';
	orderNumber: string;
	supplier: string;
	centerName: string;
	status: ZenotiOrderStatus;
	itemCount: number;
	matchedProducts: number;
	unmatchedCodes: string[];
}

// ─── Parser helpers ───────────────────────────────────────────────────────────

function cellStr(val: ExcelJS.CellValue): string {
	if (val == null) return '';
	if (typeof val === 'object' && 'text' in val)
		return String((val as { text: string }).text);
	if (typeof val === 'object' && 'result' in val)
		return String((val as { result: unknown }).result);
	return String(val).trim();
}

function parseStatus(raw: string): ZenotiOrderStatus {
	const s = raw.toUpperCase().trim();
	// CREATED is a pre-RAISED state in Zenoti — treat as RAISED
	if (s === 'CREATED') return 'RAISED';
	if (s === 'UPDATED') return 'UPDATED';
	if (s === 'DELIVERED') return 'DELIVERED';
	if (s === 'CANCELLED') return 'CANCELLED';
	return 'RAISED';
}

function parseDate(raw: string): Date | null {
	if (!raw) return null;
	const d = new Date(raw);
	return isNaN(d.getTime()) ? null : d;
}

function toCenterId(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function extractCenterName(addr: string): string {
	// BFS: "Beauty First Spa - Limeridge Mall, Limeridge Mall, 999 Upper..."
	const bfsMatch = addr.match(/^Beauty First Spa\s*-\s*([^,]+)/i);
	if (bfsMatch) return bfsMatch[1].trim();
	// BL: "Beauty Logix, Bolton, 150 Mc Ewan..."
	const blMatch = addr.match(/^Beauty Logix,\s*([^,]+)/i);
	if (blMatch) return blMatch[1].trim();
	return addr.split(',')[0].trim();
}

// ─── Core parser ─────────────────────────────────────────────────────────────

export function parseOrderFile(sheet: ExcelJS.Worksheet): ParsedOrder {
	const rows: { n: number; vals: string[] }[] = [];
	sheet.eachRow((row, n) => {
		const vals = (row.values as ExcelJS.CellValue[]).slice(1).map(cellStr);
		rows.push({ n, vals });
	});

	let orderNumber = '';
	let status: ZenotiOrderStatus = 'RAISED';
	let raisedAt: Date | null = null;
	let supplier = '';
	let billingAddress = '';
	let itemHeaderRow = -1;
	let nextRowIsAddrBlock = false;

	for (let i = 0; i < rows.length; i++) {
		const { vals } = rows[i];
		const col1 = vals[0] ?? '';
		const col9 = vals[8] ?? '';

		const poMatch = col1.match(/Purchase order \(Ref no:\s*(\w+)\)/i);
		if (poMatch) {
			orderNumber = poMatch[1];
			continue;
		}

		const statusMatch = col1.match(/Order status:\s*(\w+)/i);
		if (statusMatch) {
			status = parseStatus(statusMatch[1]);
			continue;
		}

		const dateMatch = col1.match(/(?:Ordered|Raised) date:\s*(.+)/i);
		if (dateMatch && !raisedAt) {
			raisedAt = parseDate(dateMatch[1].trim());
			continue;
		}

		// "From:" and "Billing address:" are on the SAME row; data is on the next row
		if (/^From:$/i.test(col1) && /Billing address:/i.test(col9)) {
			nextRowIsAddrBlock = true;
			continue;
		}
		if (nextRowIsAddrBlock && (col1 || col9)) {
			if (col1) supplier = col1.replace(/,\s*$/, '').trim();
			if (col9) billingAddress = col9;
			nextRowIsAddrBlock = false;
			continue;
		}

		// Line-item header: col1="#", col2="Code"
		if (col1 === '#' && /^code$/i.test(vals[1] ?? '')) {
			itemHeaderRow = i;
			continue;
		}
	}

	const items: ParsedItem[] = [];
	if (itemHeaderRow >= 0) {
		for (let i = itemHeaderRow + 1; i < rows.length; i++) {
			const { vals } = rows[i];
			const col1 = vals[0] ?? '';
			if (/^Total quantity/i.test(col1) || /^Subtotal/i.test(col1)) break;
			if (!col1 || !/^\d+$/.test(col1)) continue;

			const productCode = vals[1] ?? '';
			const productName = vals[3] ?? '';
			if (!productCode && !productName) continue;

			items.push({
				productCode,
				productName,
				retailRaised: parseFloat(vals[5] ?? '0') || 0,
				consumableRaised: parseFloat(vals[6] ?? '0') || 0,
				unitPrice: parseFloat(vals[7] ?? '') || null,
			});
		}
	}

	return {
		orderNumber,
		status,
		raisedAt,
		supplier,
		centerName: billingAddress
			? extractCenterName(billingAddress)
			: 'Unknown',
		items,
	};
}

// ─── DB upsert ────────────────────────────────────────────────────────────────

export async function upsertZenotiOrder(
	parsed: ParsedOrder,
	org: string
): Promise<UpsertResult> {
	const zenotiOrderId = `MANUAL-${org.toUpperCase()}-${parsed.orderNumber}`;
	const notes = parsed.supplier ? `From: ${parsed.supplier}` : null;

	// Match product codes to BFS barcodes
	const codes = parsed.items.map((i) => i.productCode).filter(Boolean);
	const matched =
		codes.length > 0
			? await prisma.product.findMany({
					where: { barcode: { in: codes } },
					select: { id: true, barcode: true },
				})
			: [];
	const byBarcode = new Map(matched.map((p) => [p.barcode, p.id]));
	const unmatchedCodes = codes.filter((c) => !byBarcode.has(c));

	const itemsData = parsed.items.map((item) => ({
		productCode: item.productCode,
		productName: item.productName,
		retailRaised: item.retailRaised,
		consumableRaised: item.consumableRaised,
		unitPrice: item.unitPrice,
	}));

	const existing = await prisma.zenotiOrder.findUnique({
		where: { zenotiOrderId },
	});

	if (existing) {
		if (existing.zenotiStatus !== parsed.status) {
			await prisma.$transaction([
				prisma.zenotiOrderItem.deleteMany({
					where: { orderId: existing.id },
				}),
				prisma.zenotiOrder.update({
					where: { id: existing.id },
					data: {
						zenotiStatus: parsed.status,
						supplier: parsed.supplier || null,
						notes,
						raisedAt: parsed.raisedAt ?? undefined,
						centerName: parsed.centerName,
						lastSyncedAt: new Date(),
						items: { create: itemsData },
					},
				}),
			]);
			return {
				action: 'updated',
				orderNumber: parsed.orderNumber,
				supplier: parsed.supplier,
				centerName: parsed.centerName,
				status: parsed.status,
				itemCount: parsed.items.length,
				matchedProducts: matched.length,
				unmatchedCodes,
			};
		}
		return {
			action: 'skipped',
			orderNumber: parsed.orderNumber,
			supplier: parsed.supplier,
			centerName: parsed.centerName,
			status: parsed.status,
			itemCount: parsed.items.length,
			matchedProducts: matched.length,
			unmatchedCodes,
		};
	}

	await prisma.zenotiOrder.create({
		data: {
			zenotiOrderId,
			orderNumber: parsed.orderNumber,
			org,
			centerName: parsed.centerName,
			centerId: toCenterId(parsed.centerName),
			zenotiStatus: parsed.status,
			raisedAt: parsed.raisedAt,
			supplier: parsed.supplier || null,
			notes,
			lastSyncedAt: new Date(),
			items: { create: itemsData },
		},
	});

	return {
		action: 'created',
		orderNumber: parsed.orderNumber,
		supplier: parsed.supplier,
		centerName: parsed.centerName,
		status: parsed.status,
		itemCount: parsed.items.length,
		matchedProducts: matched.length,
		unmatchedCodes,
	};
}
