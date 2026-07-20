'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ShopifyOrderItem {
	id: string;
	shopifyLineItemId: string;
	shopifyVariantId: string | null;
	sku: string | null;
	title: string;
	variantTitle: string | null;
	quantity: number;
	price: number;
	totalDiscount: number;
	bfsMatch?: {
		quantity: number;
		product: { id: string; name: string; sku: string | null };
	} | null;
}

export interface ShopifyFulfillmentItem {
	id: string;
	fulfillmentId: string;
	shopifyLineItemId: string | null;
	productId: string | null;
	sku: string | null;
	title: string;
	variantTitle: string | null;
	requestedQty: number;
	fulfilledQty: number;
	unitPrice: number | null;
	totalDiscount: number;
	isPacked: boolean;
	notes: string | null;
	sortOrder: number;
	stockOnHand: number | null;
	isInverness: boolean;
}

export interface ShopifyFulfillment {
	id: string;
	orderId: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'INVOICED';
	submittedAt: string | null;
	submittedBy: string | null;
	items: ShopifyFulfillmentItem[];
}

export interface ShopifyOrder {
	id: string;
	shopifyOrderId: string;
	storeDomain: string;
	orderNumber: string;
	customerName: string | null;
	customerEmail: string | null;
	shippingName: string | null;
	shippingAddress1: string | null;
	shippingCity: string | null;
	shippingProvince: string | null;
	shippingZip: string | null;
	shippingCountry: string | null;
	totalPrice: number | null;
	totalDiscounts: number | null;
	discountCodes: string | null;
	currency: string;
	financialStatus: string | null;
	fulfillmentStatus: string | null;
	shopifyStatus: string;
	note: string | null;
	tags: string | null;
	isAcknowledged: boolean;
	createdAtShopify: string;
	lastSyncedAt: string;
	items: ShopifyOrderItem[];
	fulfillment: ShopifyFulfillment | null;
}

const ORDERS_KEY = ['shopify-orders'];

export interface ShopifyOrderFilters {
	store?: string;
	acknowledged?: boolean;
	financialStatus?: string;
	fulfillmentStatus?: string;
	page?: number;
	limit?: number;
}

export function useShopifyOrders(filters: ShopifyOrderFilters = {}) {
	return useQuery({
		queryKey: [...ORDERS_KEY, filters],
		queryFn: async () => {
			const p = new URLSearchParams();
			if (filters.store) p.set('store', filters.store);
			if (filters.acknowledged !== undefined)
				p.set('acknowledged', String(filters.acknowledged));
			if (filters.financialStatus)
				p.set('financialStatus', filters.financialStatus);
			if (filters.fulfillmentStatus)
				p.set('fulfillmentStatus', filters.fulfillmentStatus);
			if (filters.page) p.set('page', String(filters.page));
			if (filters.limit) p.set('limit', String(filters.limit));
			const { data } = await api.get<{
				data: ShopifyOrder[];
				total: number;
				page: number;
				limit: number;
			}>(`/shopify/orders?${p}`);
			return data;
		},
	});
}

export function useShopifyOrder(id: string) {
	return useQuery({
		queryKey: ['shopify-order', id],
		queryFn: () =>
			api.get<ShopifyOrder>(`/shopify/orders/${id}`).then((r) => r.data),
		enabled: !!id,
	});
}

export function useAcknowledgeShopifyOrder() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			api
				.patch(`/shopify/orders/${id}`, { isAcknowledged: true })
				.then((r) => r.data),
		onSuccess: (_data, id) => {
			qc.invalidateQueries({ queryKey: ORDERS_KEY });
			qc.invalidateQueries({ queryKey: ['shopify-order', id] });
		},
	});
}

export function useCreateShopifyFulfillment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (orderId: string) =>
			api
				.post(`/shopify/orders/${orderId}/fulfillment`)
				.then((r) => r.data),
		onSuccess: (_data, orderId) => {
			qc.invalidateQueries({ queryKey: ['shopify-order', orderId] });
			qc.invalidateQueries({ queryKey: ORDERS_KEY });
		},
	});
}

export function useUpdateShopifyFulfillmentItem() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			fulfillmentId,
			itemId,
			orderId,
			...data
		}: {
			fulfillmentId: string;
			itemId: string;
			orderId: string;
			fulfilledQty?: number;
			isPacked?: boolean;
			notes?: string;
		}) =>
			api
				.patch(
					`/shopify/fulfillments/${fulfillmentId}/items/${itemId}`,
					data
				)
				.then((r) => r.data),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['shopify-order', vars.orderId] });
		},
	});
}

export function useSubmitShopifyFulfillment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			fulfillmentId,
		}: {
			fulfillmentId: string;
			orderId: string;
		}) =>
			api
				.post(`/shopify/fulfillments/${fulfillmentId}/submit`)
				.then((r) => r.data),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['shopify-order', vars.orderId] });
			qc.invalidateQueries({ queryKey: ORDERS_KEY });
		},
	});
}

export function useSendShopifyPackingListEmail() {
	return useMutation({
		mutationFn: (fulfillmentId: string) =>
			api
				.post(`/shopify/fulfillments/${fulfillmentId}/send-email`)
				.then((r) => r.data),
	});
}

export function useNotifyShopifyInverness() {
	return useMutation({
		mutationFn: (fulfillmentId: string) =>
			api
				.post(`/shopify/fulfillments/${fulfillmentId}/notify-inverness`)
				.then((r) => r.data),
	});
}

export function useSyncShopifyOrders() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () =>
			api.post('/integrations/shopify/sync').then((r) => r.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ORDERS_KEY }),
	});
}

export function useSyncShopifyInventory() {
	return useMutation({
		mutationFn: () =>
			api
				.post('/integrations/shopify/sync-inventory')
				.then((r) => r.data),
	});
}
