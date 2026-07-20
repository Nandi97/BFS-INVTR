import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import {
	getConnectedStores,
	getShopifyStores,
	fetchShopifyOrders,
	fetchShopifyOrder,
	customerName,
	type ShopifyApiOrder,
} from '@/lib/shopify';
import { sendShopifyNewOrdersEmail } from '@/lib/shopify-email';

export async function POST(req: NextRequest) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	// Also accept CRON_SECRET for the nightly cron call
	const authHeader = req.headers.get('authorization');
	const isCron =
		process.env.CRON_SECRET &&
		authHeader === `Bearer ${process.env.CRON_SECRET}`;
	if (!isCron && auth instanceof NextResponse) return auth;

	const body = await req.json().catch(() => ({}));
	const shopFilter: string | undefined = body?.shop;

	let stores = (await getConnectedStores()).concat(getShopifyStores());
	if (shopFilter) stores = stores.filter((s) => s.domain === shopFilter);
	if (stores.length === 0) {
		return NextResponse.json(
			{
				error: shopFilter
					? `Store ${shopFilter} not found. Check it is connected in Integrations.`
					: 'No Shopify stores connected. Go to Integrations to connect a store.',
			},
			{ status: 503 }
		);
	}

	const results: Record<
		string,
		{
			created: number;
			updated: number;
			error?: string;
			staleErrors?: string[];
		}
	> = {};
	const allNewOrders: { storeDomain: string; order: ShopifyApiOrder }[] = [];

	for (const store of stores) {
		try {
			const orders = await fetchShopifyOrders(store);
			let created = 0;
			let updated = 0;

			for (const order of orders) {
				const existing = await prisma.shopifyOrder.findUnique({
					where: { shopifyOrderId: String(order.id) },
					select: { id: true, isAcknowledged: true },
				});

				const data = {
					storeDomain: store.domain,
					orderNumber: order.name,
					customerName: customerName(order),
					customerEmail: order.customer?.email ?? order.email ?? null,
					shippingName: order.shipping_address?.name ?? null,
					shippingAddress1: order.shipping_address?.address1 ?? null,
					shippingCity: order.shipping_address?.city ?? null,
					shippingProvince: order.shipping_address?.province ?? null,
					shippingZip: order.shipping_address?.zip ?? null,
					shippingCountry: order.shipping_address?.country ?? null,
					totalPrice: parseFloat(order.total_price) || null,
					totalDiscounts: parseFloat(order.total_discounts) || null,
					discountCodes:
						order.discount_codes?.map((d) => d.code).join(', ') ||
						null,
					currency: order.currency,
					financialStatus: order.financial_status,
					fulfillmentStatus: order.fulfillment_status,
					shopifyStatus: order.status,
					note: order.note,
					tags: order.tags || null,
					createdAtShopify: new Date(order.created_at),
					lastSyncedAt: new Date(),
				};

				if (existing) {
					await prisma.shopifyOrder.update({
						where: { id: existing.id },
						data: {
							...data,
							// re-open acknowledgement if status changed back to unfulfilled
							isAcknowledged:
								order.fulfillment_status === null
									? existing.isAcknowledged
									: existing.isAcknowledged,
						},
					});
					updated++;
				} else {
					await prisma.shopifyOrder.create({
						data: {
							shopifyOrderId: String(order.id),
							...data,
							items: {
								create: order.line_items.map((item) => ({
									shopifyLineItemId: String(item.id),
									shopifyVariantId: item.variant_id
										? String(item.variant_id)
										: null,
									sku: item.sku,
									title: item.title,
									variantTitle: item.variant_title,
									quantity: item.quantity,
									price: parseFloat(item.price) || 0,
									totalDiscount:
										parseFloat(item.total_discount) || 0,
								})),
							},
						},
					});
					allNewOrders.push({ storeDomain: store.domain, order });
					created++;
				}
			}

			// Second pass: update status of orders that dropped out of the unfulfilled feed
			const seenIds = new Set(orders.map((o) => String(o.id)));
			const staleWhere = {
				storeDomain: store.domain,
				fulfillmentStatus: null,
				...(seenIds.size > 0
					? { shopifyOrderId: { notIn: [...seenIds] } }
					: {}),
			};
			const stale = await prisma.shopifyOrder.findMany({
				where: staleWhere,
				select: { id: true, shopifyOrderId: true },
			});
			const staleErrors: string[] = [];
			for (const bfsOrder of stale) {
				try {
					const latest = await fetchShopifyOrder(
						store,
						bfsOrder.shopifyOrderId
					);
					await prisma.shopifyOrder.update({
						where: { id: bfsOrder.id },
						data: {
							fulfillmentStatus: latest.fulfillment_status,
							shopifyStatus: latest.status,
							financialStatus: latest.financial_status,
							lastSyncedAt: new Date(),
						},
					});
					updated++;
				} catch (e) {
					staleErrors.push(
						`${bfsOrder.shopifyOrderId}: ${e instanceof Error ? e.message : String(e)}`
					);
				}
			}

			results[store.domain] = {
				created,
				updated,
				...(staleErrors.length ? { staleErrors } : {}),
			};
		} catch (err) {
			results[store.domain] = {
				created: 0,
				updated: 0,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	// Write SyncLog
	const totalCreated = Object.values(results).reduce(
		(s, r) => s + r.created,
		0
	);
	const totalUpdated = Object.values(results).reduce(
		(s, r) => s + r.updated,
		0
	);

	await prisma.syncLog.create({
		data: {
			provider: 'SHOPIFY',
			type: 'ORDER_SYNC',
			status: 'SUCCESS',
			message: `Created ${totalCreated}, updated ${totalUpdated} orders across ${stores.length} store(s)`,
			recordsIn: totalCreated + totalUpdated,
			recordsOut: totalCreated,
		},
	});

	// Fire email notification if new orders arrived
	if (allNewOrders.length > 0) {
		sendShopifyNewOrdersEmail(allNewOrders).catch(console.error);
	}

	return NextResponse.json({ ok: true, stores: results });
}
