'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ConnectedShopifyStore {
	shop: string;
	scope: string;
	connectedAt: string;
}

const KEY = ['shopify-stores'];

export function useShopifyConnectedStores() {
	return useQuery({
		queryKey: KEY,
		queryFn: () =>
			api
				.get<{
					stores: ConnectedShopifyStore[];
					isActive: boolean;
				}>('/integrations/shopify/stores')
				.then((r) => r.data),
	});
}

export function useDisconnectShopifyStore() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (shop: string) =>
			api
				.delete('/integrations/shopify/stores', { data: { shop } })
				.then((r) => r.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
	});
}

export function useSyncShopifyOrdersForStore() {
	return useMutation({
		mutationFn: (shop: string) =>
			api
				.post<{
					ok: boolean;
					stores: Record<
						string,
						{ created: number; updated: number; error?: string }
					>;
				}>('/integrations/shopify/sync', { shop })
				.then((r) => r.data),
	});
}

export function useSyncShopifyInventoryForStore() {
	return useMutation({
		mutationFn: (shop: string) =>
			api
				.post<{
					ok: boolean;
					stores: Record<
						string,
						{
							synced: number;
							skipped: number;
							errors: string[];
							error?: string;
						}
					>;
				}>('/integrations/shopify/sync-inventory', { shop })
				.then((r) => r.data),
	});
}

export function usePushShopifyPricesForStore() {
	return useMutation({
		mutationFn: (shop: string) =>
			api
				.post<{
					ok: boolean;
					stores: Record<
						string,
						{
							synced: number;
							skipped: number;
							pricesSynced: number;
							errors: string[];
							error?: string;
						}
					>;
				}>('/integrations/shopify/sync-prices', { shop })
				.then((r) => r.data),
	});
}
