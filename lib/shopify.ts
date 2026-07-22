export interface ShopifyStoreConfig {
	domain: string;
	token: string;
}

export interface ShopifyAddress {
	name?: string;
	address1?: string;
	city?: string;
	province?: string;
	zip?: string;
	country?: string;
}

export interface ShopifyApiLineItem {
	id: number;
	variant_id: number | null;
	sku: string | null;
	title: string;
	variant_title: string | null;
	quantity: number;
	price: string; // unit list price, before this line's discount
	total_discount: string; // dollar amount of discount applied across this line's quantity
}

export interface ShopifyDiscountCode {
	code: string;
	amount: string;
	type: string;
}

export interface ShopifyApiOrder {
	id: number;
	order_number: number;
	name: string; // e.g. "#1001"
	email: string | null;
	customer?: { first_name?: string; last_name?: string; email?: string };
	shipping_address?: ShopifyAddress;
	billing_address?: ShopifyAddress;
	total_price: string;
	total_discounts: string;
	discount_codes: ShopifyDiscountCode[];
	currency: string;
	financial_status: string;
	fulfillment_status: string | null;
	status: string; // open | closed | cancelled
	note: string | null;
	tags: string;
	created_at: string;
	line_items: ShopifyApiLineItem[];
}

export type ShopifyProductStatus = 'active' | 'draft' | 'archived';

export interface ShopifyProduct {
	id: number;
	title?: string;
	vendor?: string;
	product_type?: string;
	status?: ShopifyProductStatus;
	variants: ShopifyVariant[];
	images?: { src: string }[];
}

export interface ShopifyVariant {
	id: number;
	sku: string | null;
	inventory_item_id: number;
	inventory_quantity: number;
	price: string; // Shopify returns price as a decimal string e.g. "29.99"
}

export interface ShopifyLocation {
	id: number;
	name: string;
	active: boolean;
}

type DbStoreEntry = {
	shop: string;
	accessToken: string;
	scope: string;
	connectedAt: string;
};

export async function getConnectedStores(): Promise<ShopifyStoreConfig[]> {
	// Import here to avoid circular dep — lib/shopify has no direct prisma dep otherwise
	const { prisma } = await import('@/lib/prisma');
	const row = await prisma.integrationConfig.findUnique({
		where: { provider: 'SHOPIFY' },
	});
	if (!row) return [];
	const cfg = row.config as { stores?: DbStoreEntry[] };
	return (cfg.stores ?? []).map((s) => ({
		domain: s.shop,
		token: s.accessToken,
	}));
}

// Kept for backward compat / local testing via env vars
export function getShopifyStores(): ShopifyStoreConfig[] {
	const stores: ShopifyStoreConfig[] = [];
	for (let i = 1; i <= 5; i++) {
		const domain = process.env[`SHOPIFY_STORE_${i}_DOMAIN`];
		const token = process.env[`SHOPIFY_STORE_${i}_TOKEN`];
		if (domain && token) stores.push({ domain, token });
	}
	return stores;
}

/** Resolves a single connected store (DB OAuth or env-var) by domain, or null if not connected. */
export async function getStoreByDomain(
	domain: string
): Promise<ShopifyStoreConfig | null> {
	const stores = (await getConnectedStores()).concat(getShopifyStores());
	return stores.find((s) => s.domain === domain) ?? null;
}

const API_VERSION = '2024-01';

function shopifyFetch<T>(
	store: ShopifyStoreConfig,
	path: string,
	options?: RequestInit
): Promise<T> {
	return fetch(`https://${store.domain}/admin/api/${API_VERSION}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			'X-Shopify-Access-Token': store.token,
			...options?.headers,
		},
	}).then(async (res) => {
		if (!res.ok) {
			const text = await res.text().catch(() => res.statusText);
			throw new Error(`Shopify API ${res.status}: ${text}`);
		}
		return res.json() as Promise<T>;
	});
}

export async function fetchShopifyOrders(
	store: ShopifyStoreConfig,
	sinceId?: string
): Promise<ShopifyApiOrder[]> {
	const params = new URLSearchParams({
		status: 'open',
		fulfillment_status: 'unfulfilled',
		limit: '250',
	});
	if (sinceId) params.set('since_id', sinceId);

	const data = await shopifyFetch<{ orders: ShopifyApiOrder[] }>(
		store,
		`/orders.json?${params}`
	);
	return data.orders;
}

export async function fetchShopifyOrder(
	store: ShopifyStoreConfig,
	shopifyOrderId: string
): Promise<ShopifyApiOrder> {
	const data = await shopifyFetch<{ order: ShopifyApiOrder }>(
		store,
		`/orders/${shopifyOrderId}.json`
	);
	return data.order;
}

export async function fetchShopifyProducts(
	store: ShopifyStoreConfig
): Promise<ShopifyProduct[]> {
	const all: ShopifyProduct[] = [];
	let pageInfo: string | null = null;

	do {
		const params = new URLSearchParams({
			limit: '250',
			fields: 'id,title,vendor,product_type,status,variants',
		});
		if (pageInfo) params.set('page_info', pageInfo);

		const res = await fetch(
			`https://${store.domain}/admin/api/${API_VERSION}/products.json?${params}`,
			{
				headers: {
					'Content-Type': 'application/json',
					'X-Shopify-Access-Token': store.token,
				},
			}
		);

		if (!res.ok) {
			const text = await res.text().catch(() => res.statusText);
			throw new Error(`Shopify products API ${res.status}: ${text}`);
		}
		const linkHeader = res.headers.get('Link');
		const data = (await res.json()) as { products?: ShopifyProduct[] };
		if (!Array.isArray(data.products)) {
			throw new Error(
				`Shopify products response missing products array: ${JSON.stringify(data).slice(0, 200)}`
			);
		}
		all.push(...data.products);

		const nextMatch = linkHeader?.match(
			/<[^>]+page_info=([^>&]+)[^>]*>;\s*rel="next"/
		);
		pageInfo = nextMatch ? nextMatch[1] : null;
	} while (pageInfo);

	return all;
}

export async function fetchShopifyLocations(
	store: ShopifyStoreConfig
): Promise<ShopifyLocation[]> {
	const data = await shopifyFetch<{ locations: ShopifyLocation[] }>(
		store,
		'/locations.json'
	);
	return data.locations.filter((l) => l.active);
}

export async function setInventoryLevel(
	store: ShopifyStoreConfig,
	inventoryItemId: number,
	locationId: number,
	available: number
): Promise<void> {
	await shopifyFetch(store, '/inventory_levels/set.json', {
		method: 'POST',
		body: JSON.stringify({
			inventory_item_id: inventoryItemId,
			location_id: locationId,
			available: Math.max(0, Math.round(available)),
		}),
	});
}

export async function setVariantPrice(
	store: ShopifyStoreConfig,
	variantId: number,
	price: number
): Promise<void> {
	await shopifyFetch(store, `/variants/${variantId}.json`, {
		method: 'PUT',
		body: JSON.stringify({
			variant: { id: variantId, price: price.toFixed(2) },
		}),
	});
}

export interface CreateShopifyProductInput {
	title: string;
	vendor?: string;
	product_type?: string;
	status: ShopifyProductStatus;
	sku?: string;
	barcode?: string;
	price: number;
	inventory_quantity?: number;
	imageUrl?: string;
}

export async function createShopifyProduct(
	store: ShopifyStoreConfig,
	data: CreateShopifyProductInput
): Promise<ShopifyProduct> {
	const res = await shopifyFetch<{ product: ShopifyProduct }>(
		store,
		'/products.json',
		{
			method: 'POST',
			body: JSON.stringify({
				product: {
					title: data.title,
					vendor: data.vendor,
					product_type: data.product_type,
					status: data.status,
					variants: [
						{
							sku: data.sku,
							barcode: data.barcode,
							price: data.price.toFixed(2),
							inventory_management: 'shopify',
							inventory_quantity: Math.max(
								0,
								Math.round(data.inventory_quantity ?? 0)
							),
						},
					],
					images: data.imageUrl
						? [{ src: data.imageUrl }]
						: undefined,
				},
			}),
		}
	);
	return res.product;
}

/** Vendor/product_type/status are all product-level in Shopify, not per variant. */
export async function updateShopifyProduct(
	store: ShopifyStoreConfig,
	productId: number,
	data: {
		vendor?: string;
		product_type?: string;
		status?: ShopifyProductStatus;
	}
): Promise<void> {
	await shopifyFetch(store, `/products/${productId}.json`, {
		method: 'PUT',
		body: JSON.stringify({ product: { id: productId, ...data } }),
	});
}

export function customerName(order: ShopifyApiOrder): string {
	if (order.customer?.first_name || order.customer?.last_name) {
		return [order.customer.first_name, order.customer.last_name]
			.filter(Boolean)
			.join(' ');
	}
	if (order.shipping_address?.name) return order.shipping_address.name;
	return order.email ?? 'Unknown';
}
