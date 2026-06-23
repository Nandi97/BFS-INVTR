import { NextRequest, NextResponse } from 'next/server';
import { fetchQboItems, fetchQboInvoices, type QboItem } from '@/lib/qbo';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export interface ItemMatchResult {
	qboId: string;
	qboName: string;
	sku: string | null;
	qtyOnHand: number;
	matched: boolean;
	matchedProductId?: string;
	matchedProductName?: string;
	matchMethod?: 'sku' | 'barcode' | 'exact' | 'hierarchy-stripped';
}

export type { QboItem };

function stripHierarchy(name: string) {
	const parts = name.split(':');
	return parts[parts.length - 1].trim();
}

async function resolveProduct(fqn: string, sku?: string) {
	const stripped = stripHierarchy(fqn);

	const candidates = [
		...(sku
			? [
					{
						field: 'sku',
						where: {
							sku: {
								equals: sku.trim(),
								mode: 'insensitive' as const,
							},
						},
					},
				]
			: []),
		...(sku
			? [
					{
						field: 'barcode',
						where: {
							barcode: {
								equals: sku.trim(),
								mode: 'insensitive' as const,
							},
						},
					},
				]
			: []),
		{
			field: 'exact',
			where: { name: { equals: stripped, mode: 'insensitive' as const } },
		},
		{
			field: 'hierarchy-stripped',
			where: {
				name: { equals: fqn.trim(), mode: 'insensitive' as const },
			},
		},
	] as { field: string; where: object }[];

	for (const { field, where } of candidates) {
		const hit = await prisma.product.findFirst({
			where: { isActive: true, ...where },
			select: { id: true, name: true },
		});
		if (hit)
			return {
				...hit,
				matchMethod: field as ItemMatchResult['matchMethod'],
			};
	}
	return null;
}

/**
 * GET  — fetch all QBO inventory items and run them through our product resolver.
 *        Returns a match report: which items matched, which didn't, and by what method.
 * POST — fetch + match + sync QtyOnHand into the DB (same as XLS import but live from QBO).
 */
export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;
	const limit = Math.min(parseInt(searchParams.get('limit') ?? '9999'), 9999);

	let qboItems: QboItem[];
	try {
		qboItems = await fetchQboItems();
	} catch (err: unknown) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : String(err) },
			{ status: 502 }
		);
	}

	const subset = qboItems.slice(0, limit);
	const results: ItemMatchResult[] = [];

	for (const item of subset) {
		const hit = await resolveProduct(item.FullyQualifiedName, item.Sku);
		results.push({
			qboId: item.Id,
			qboName: item.FullyQualifiedName,
			sku: item.Sku ?? null,
			qtyOnHand: item.QtyOnHand ?? 0,
			matched: !!hit,
			matchedProductId: hit?.id,
			matchedProductName: hit?.name,
			matchMethod: hit?.matchMethod,
		});
	}

	const matched = results.filter((r) => r.matched);
	const unmatched = results.filter((r) => !r.matched);

	const byMethod = matched.reduce<Record<string, number>>((acc, r) => {
		const m = r.matchMethod ?? 'unknown';
		acc[m] = (acc[m] ?? 0) + 1;
		return acc;
	}, {});

	return NextResponse.json({
		summary: {
			total: results.length,
			matched: matched.length,
			unmatched: unmatched.length,
			matchRate: results.length
				? `${Math.round((matched.length / results.length) * 100)}%`
				: '0%',
			byMethod,
		},
		matched,
		unmatched,
	});
}

export async function POST(req: NextRequest) {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	const body = await req.json().catch(() => ({}));
	const locationName: string = body.location ?? 'BF Warehouse';

	let qboItems: QboItem[];
	try {
		qboItems = await fetchQboItems();
	} catch (err: unknown) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : String(err) },
			{ status: 502 }
		);
	}

	const loc = await prisma.location.findFirst({
		where: {
			isActive: true,
			OR: [
				{ name: { equals: locationName, mode: 'insensitive' } },
				{ code: { equals: locationName, mode: 'insensitive' } },
			],
		},
		select: { id: true },
	});
	if (!loc) {
		return NextResponse.json(
			{ error: `Location "${locationName}" not found` },
			{ status: 422 }
		);
	}

	let synced = 0,
		skipped = 0,
		deactivated = 0,
		dispatched = 0,
		restocked = 0,
		unchanged = 0,
		costUpdated = 0;
	const errors: string[] = [];
	const startedAt = new Date();

	// Fetch QB invoices since last sync to attribute dispatch movements to stores
	type InvoiceRef = { docNumber: string; customerName: string };
	const invoiceMap = new Map<string, InvoiceRef[]>();
	// Hoisted so delta loop can check INTERNAL_USE movements since this date
	let lastSyncAt: Date = new Date(Date.now() - 48 * 60 * 60 * 1000);
	try {
		const config = await prisma.integrationConfig.findUnique({
			where: { provider: 'QUICKBOOKS' },
			select: { lastSyncAt: true },
		});
		// Default to 48 hours ago if this is the first sync, to catch recent invoices
		const since = config?.lastSyncAt ?? lastSyncAt;
		lastSyncAt = since;
		const sinceDate = since.toISOString().slice(0, 10);

		const invoices = await fetchQboInvoices(sinceDate);
		for (const inv of invoices) {
			const customerName = inv.CustomerRef?.name ?? 'Unknown';
			for (const line of inv.Line) {
				if (line.DetailType !== 'SalesItemLineDetail') continue;
				const itemId = line.SalesItemLineDetail?.ItemRef?.value;
				if (!itemId) continue;
				const existing = invoiceMap.get(itemId) ?? [];
				existing.push({ docNumber: inv.DocNumber, customerName });
				invoiceMap.set(itemId, existing);
			}
		}
	} catch {
		// Non-fatal: if invoice fetch fails, dispatch movements are still written
		// but without reference/store attribution
		errors.push(
			'Invoice attribution unavailable (invoice fetch failed); dispatch movements written without store reference'
		);
	}

	for (const item of qboItems) {
		const hit = await resolveProduct(item.FullyQualifiedName, item.Sku);
		if (!hit) {
			// Stage for admin review instead of silently dropping
			const suggestedBrand = item.FullyQualifiedName.includes(':')
				? item.FullyQualifiedName.split(':')[0].trim()
				: null;
			await prisma.pendingProduct.upsert({
				where: { qboItemId: item.Id },
				update: {
					qboName: item.FullyQualifiedName,
					qboSku: item.Sku ?? null,
					qtyOnHand: Math.max(0, item.QtyOnHand ?? 0),
					purchaseCost: item.PurchaseCost ?? null,
					suggestedBrandName: suggestedBrand,
					lastSeenAt: new Date(),
					seenCount: { increment: 1 },
				},
				create: {
					qboItemId: item.Id,
					qboName: item.FullyQualifiedName,
					qboSku: item.Sku ?? null,
					qtyOnHand: Math.max(0, item.QtyOnHand ?? 0),
					purchaseCost: item.PurchaseCost ?? null,
					suggestedBrandName: suggestedBrand,
				},
			});
			skipped++;
			continue;
		}

		const qty = Math.max(0, item.QtyOnHand ?? 0);
		try {
			await prisma.$transaction(async (tx) => {
				const existing = await tx.inventory.findUnique({
					where: {
						productId_locationId: {
							productId: hit.id,
							locationId: loc.id,
						},
					},
					select: { quantity: true },
				});

				await tx.inventory.upsert({
					where: {
						productId_locationId: {
							productId: hit.id,
							locationId: loc.id,
						},
					},
					update: {
						quantity: qty,
						...(item.ReorderPoint != null
							? { reorderPoint: item.ReorderPoint }
							: {}),
					},
					create: {
						productId: hit.id,
						locationId: loc.id,
						quantity: qty,
						reorderPoint: item.ReorderPoint ?? 0,
						reorderQty: 0,
						minQuantity: 0,
					},
				});

				// Sync purchase cost from QB → ProductSupplier records for this product
				if (item.PurchaseCost != null && item.PurchaseCost > 0) {
					const updated = await tx.productSupplier.updateMany({
						where: { productId: hit.id },
						data: { cost: item.PurchaseCost },
					});
					if (updated.count > 0) costUpdated++;
				}

				if (existing === null) {
					// First-ever sync for this product — record opening snapshot
					await tx.stockMovement.create({
						data: {
							productId: hit.id,
							locationId: loc.id,
							type: 'RECONCILIATION',
							quantity: qty,
							balanceAfter: qty,
							notes: 'QBO initial sync',
						},
					});
				} else {
					const delta = qty - existing.quantity;
					if (delta < 0) {
						// QB qty dropped — check if INTERNAL_USE movements since last sync explain some/all of the drop
						const internalUsed = await tx.stockMovement.aggregate({
							where: {
								productId: hit.id,
								locationId: loc.id,
								type: 'INTERNAL_USE',
								createdAt: { gte: lastSyncAt },
							},
							_sum: { quantity: true },
						});
						const internalQty = internalUsed._sum.quantity ?? 0;
						const unexplained = Math.abs(delta) - internalQty;

						if (unexplained > 0) {
							// Remaining drop not explained by internal use — attribute to dispatch/invoice
							const refs = invoiceMap.get(item.Id) ?? [];
							const reference =
								refs.length > 0
									? refs
											.map((r) => `QB-INV-${r.docNumber}`)
											.join(', ')
									: undefined;
							const notes =
								refs.length > 0
									? `QBO sync: dispatched to ${[...new Set(refs.map((r) => r.customerName))].join(', ')}`
									: 'QBO sync: dispatched';
							await tx.stockMovement.create({
								data: {
									productId: hit.id,
									locationId: loc.id,
									type: 'ADJUSTMENT_OUT',
									quantity: unexplained,
									balanceAfter: qty,
									reference,
									notes,
								},
							});
						}
						dispatched++;
					} else if (delta > 0) {
						// QB qty rose — items were received / restocked
						await tx.stockMovement.create({
							data: {
								productId: hit.id,
								locationId: loc.id,
								type: 'ADJUSTMENT_IN',
								quantity: delta,
								balanceAfter: qty,
								notes: 'QBO sync: restocked',
							},
						});
						restocked++;
					} else {
						unchanged++;
					}
				}
			});
			synced++;
		} catch (err: unknown) {
			errors.push(
				`"${item.FullyQualifiedName}": ${err instanceof Error ? err.message : String(err)}`
			);
			skipped++;
		}
	}

	// ── Deactivate BFS products whose QB item is now inactive ──────────────────
	// Only match by SKU/barcode (strict) to avoid false positives from name matches.
	// Products manually deactivated in BFS for other reasons (e.g. Inverness direct-supply)
	// are already isActive=false and therefore skipped by the findFirst below.
	try {
		const inactiveQboItems = await fetchQboItems(false);
		for (const item of inactiveQboItems) {
			if (!item.Sku) continue;
			const sku = item.Sku.trim();
			const hit = await prisma.product.findFirst({
				where: {
					isActive: true,
					OR: [
						{ sku: { equals: sku, mode: 'insensitive' } },
						{ barcode: { equals: sku, mode: 'insensitive' } },
					],
				},
				select: { id: true },
			});
			if (hit) {
				await prisma.product.update({
					where: { id: hit.id },
					data: { isActive: false },
				});
				deactivated++;
			}
		}
	} catch (err: unknown) {
		errors.push(
			`Deactivation pass failed: ${err instanceof Error ? err.message : String(err)}`
		);
	}

	await prisma.syncLog.create({
		data: {
			provider: 'QUICKBOOKS',
			type: 'STOCK_SYNC',
			status:
				errors.length > 0 && synced === 0
					? 'FAILED'
					: errors.length > 0
						? 'PARTIAL'
						: 'SUCCESS',
			message: `QBO API sync: ${synced} synced (${dispatched} dispatched, ${restocked} restocked, ${unchanged} unchanged), ${costUpdated} costs updated, ${skipped} skipped, ${deactivated} deactivated`,
			recordsIn: qboItems.length,
			recordsOut: synced,
		},
	});

	await prisma.integrationConfig.update({
		where: { provider: 'QUICKBOOKS' },
		data: { lastSyncAt: startedAt },
	});

	return NextResponse.json({
		total: qboItems.length,
		synced,
		skipped,
		deactivated,
		movements: { dispatched, restocked, unchanged },
		costUpdated,
		errors: errors.slice(0, 30),
	});
}
