import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import {
	fetchZenotiCenters,
	fetchZenotiPOs,
	mapZenotiStatus,
} from '@/lib/zenoti';
import type { ZenotiOrg } from '@/lib/zenoti';

export async function POST(request: Request) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const orgs: ZenotiOrg[] = ['bfs', 'bl'];
	const results: Record<string, unknown> = {};
	let totalNew = 0;
	let totalUpdated = 0;

	for (const org of orgs) {
		const apiKeyEnv =
			org === 'bfs' ? 'ZENOTI_BFS_API_KEY' : 'ZENOTI_BL_API_KEY';
		if (!process.env[apiKeyEnv]) {
			results[org] = {
				skipped: true,
				reason: `${apiKeyEnv} not configured`,
			};
			continue;
		}

		try {
			const centers = await fetchZenotiCenters(org);
			let orgNew = 0;
			let orgUpdated = 0;

			for (const center of centers) {
				const pos = await fetchZenotiPOs(org, center.id, [
					'Raised',
					'Updated',
				]);

				for (const po of pos) {
					const zenotiStatus = mapZenotiStatus(po.status);
					const existing = await prisma.zenotiOrder.findUnique({
						where: { zenotiOrderId: po.id },
					});

					if (!existing) {
						await prisma.zenotiOrder.create({
							data: {
								zenotiOrderId: po.id,
								orderNumber: po.order_no,
								org,
								centerName: center.name,
								centerId: center.id,
								zenotiStatus,
								raisedAt: po.raised_date
									? new Date(po.raised_date)
									: null,
								deliverBy: po.deliver_by
									? new Date(po.deliver_by)
									: null,
								notes: po.notes ?? null,
								lastSyncedAt: new Date(),
								items: {
									create: po.items.map((item) => ({
										zenotiItemId: item.id ?? null,
										productCode: item.product_code,
										productName: item.product_name,
										retailRaised:
											item.retail_raised_qty ?? 0,
										consumableRaised:
											item.consumable_raised_qty ?? 0,
										unitPrice: item.unit_price ?? null,
									})),
								},
							},
						});
						orgNew++;
					} else if (
						existing.zenotiStatus !== zenotiStatus ||
						zenotiStatus === 'UPDATED'
					) {
						// Re-sync items on status change or UPDATED orders
						await prisma.$transaction([
							prisma.zenotiOrderItem.deleteMany({
								where: { orderId: existing.id },
							}),
							prisma.zenotiOrder.update({
								where: { id: existing.id },
								data: {
									zenotiStatus,
									raisedAt: po.raised_date
										? new Date(po.raised_date)
										: undefined,
									deliverBy: po.deliver_by
										? new Date(po.deliver_by)
										: undefined,
									notes: po.notes ?? null,
									lastSyncedAt: new Date(),
									items: {
										create: po.items.map((item) => ({
											zenotiItemId: item.id ?? null,
											productCode: item.product_code,
											productName: item.product_name,
											retailRaised:
												item.retail_raised_qty ?? 0,
											consumableRaised:
												item.consumable_raised_qty ?? 0,
											unitPrice: item.unit_price ?? null,
										})),
									},
								},
							}),
						]);
						orgUpdated++;
					}
				}
			}

			results[org] = {
				centers: centers.length,
				new: orgNew,
				updated: orgUpdated,
			};
			totalNew += orgNew;
			totalUpdated += orgUpdated;
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			results[org] = { error: message };
		}
	}

	await prisma.syncLog.create({
		data: {
			provider: 'ZENOTI',
			type: 'PROCUREMENT_SYNC',
			status: 'SUCCESS',
			message: `Synced ${totalNew} new + ${totalUpdated} updated POs`,
			recordsIn: totalNew + totalUpdated,
			recordsOut: 0,
		},
	});

	return NextResponse.json({ ok: true, results, totalNew, totalUpdated });
}
