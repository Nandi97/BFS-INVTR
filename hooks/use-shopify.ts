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
	bfsMatch?: {
		quantity: number;
		product: { id: string; name: string; sku: string | null };
	} | null;
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
