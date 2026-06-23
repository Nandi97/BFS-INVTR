import { NextResponse } from 'next/server';
import { fetchQboItems, type QboItem } from '@/lib/qbo';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

function stripHierarchy(name: string) {
	const parts = name.split(':');
	return parts[parts.length - 1].trim();
}

export interface NameSyncChange {
	qboName: string;
	qboSku: string | null;
	oldName: string;
	newName: string;
	skuSet: boolean;
	matchMethod: 'sku' | 'barcode';
}

export interface NameSyncResult {
	renamed: NameSyncChange[];
	skuSet: number;
	unmatched: string[];
	noSku: number;
	total: number;
}

/** POST /api/integrations/quickbooks/items/sync-names
 *
 * Fetches all active Inventory items from QB, then for each item that has a SKU:
 * 1. Looks up the matching product by sku or barcode (confident match).
 * 2. Overwrites product.name with QB's canonical name (hierarchy-stripped).
 * 3. Back-fills product.sku if it was null (bootstraps SKU for future runs).
 *
 * Items without a QB SKU are skipped — name-only matches are too ambiguous.
 * NOT included in the nightly cron — runs monthly (1st of each month) or on demand.
 */
export async function POST() {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	let qboItems: QboItem[];
	try {
		qboItems = await fetchQboItems();
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : String(err) },
			{ status: 502 }
		);
	}

	const renamed: NameSyncChange[] = [];
	const unmatched: string[] = [];
	let noSku = 0,
		skuSetCount = 0;

	for (const item of qboItems) {
		const sku = item.Sku?.trim() || null;
		const canonical = stripHierarchy(item.FullyQualifiedName);

		if (!sku) {
			noSku++;
			continue;
		}

		const matchAttempts: Array<{
			method: 'sku' | 'barcode';
			where: object;
		}> = [
			{
				method: 'sku',
				where: { sku: { equals: sku, mode: 'insensitive' as const } },
			},
			{
				method: 'barcode',
				where: {
					barcode: { equals: sku, mode: 'insensitive' as const },
				},
			},
		];

		let matched = false;
		for (const { method, where } of matchAttempts) {
			const product = await prisma.product.findFirst({
				where: { isActive: true, ...where },
				select: { id: true, name: true, sku: true },
			});
			if (!product) continue;

			matched = true;
			const nameChanged = product.name !== canonical;
			const skuWasNull = !product.sku && method === 'barcode';

			const patch: Record<string, unknown> = {};
			if (nameChanged) patch.name = canonical;
			if (skuWasNull) {
				patch.sku = sku;
				skuSetCount++;
			}

			if (Object.keys(patch).length > 0) {
				await prisma.product.update({
					where: { id: product.id },
					data: patch,
				});
			}

			if (nameChanged) {
				renamed.push({
					qboName: item.FullyQualifiedName,
					qboSku: sku,
					oldName: product.name,
					newName: canonical,
					skuSet: skuWasNull,
					matchMethod: method,
				});
			}
			break;
		}

		if (!matched)
			unmatched.push(`${item.FullyQualifiedName} (SKU: ${sku})`);
	}

	await prisma.syncLog.create({
		data: {
			provider: 'QUICKBOOKS',
			type: 'NAME_SYNC',
			status: 'SUCCESS',
			message: `Name sync: ${renamed.length} renamed, ${skuSetCount} SKUs set, ${unmatched.length} unmatched, ${noSku} without QB SKU`,
			recordsIn: qboItems.length,
			recordsOut: renamed.length,
		},
	});

	return NextResponse.json({
		total: qboItems.length,
		renamed,
		skuSet: skuSetCount,
		unmatched,
		noSku,
	} satisfies NameSyncResult);
}
