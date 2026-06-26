import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import {
	getConnectedStores,
	getShopifyStores,
	fetchShopifyOrders,
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

	const stores = (await getConnectedStores()).concat(getShopifyStores());
	if (stores.length === 0) {
		return NextResponse.json(
			{
				error: 'No Shopify stores connected. Go to Integrations to connect a store.',
			},
			{ status: 503 }
		);
	}

	const results: Record<
		string,
		{ created: number; updated: number; error?: string }
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
								})),
							},
						},
					});
					allNewOrders.push({ storeDomain: store.domain, order });
					created++;
				}
			}

			results[store.domain] = { created, updated };
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
