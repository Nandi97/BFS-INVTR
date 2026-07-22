'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type ShopifyCatalogMode = 'ALL' | 'BRAND_FILTERED';

export interface ShopifyStoreRules {
	label: string | null;
	catalogMode: ShopifyCatalogMode;
	brandIds: string[];
}

export interface SaveShopifyStoreRulesInput {
	shop: string;
	label: string | null;
	catalogMode: ShopifyCatalogMode;
	brandIds: string[];
}

const KEY = (shop: string) => ['shopify-store-rules', shop];

export function useShopifyStoreRules(shop: string, enabled = true) {
	return useQuery({
		queryKey: KEY(shop),
		queryFn: () =>
			api
				.get<ShopifyStoreRules>('/integrations/shopify/store-rules', {
					params: { shop },
				})
				.then((r) => r.data),
		enabled: enabled && !!shop,
	});
}

export function useSaveShopifyStoreRules() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: SaveShopifyStoreRulesInput) =>
			api
				.put('/integrations/shopify/store-rules', input)
				.then((r) => r.data),
		onSuccess: (_data, variables) => {
			qc.invalidateQueries({ queryKey: KEY(variables.shop) });
			qc.invalidateQueries({ queryKey: ['shopify-stores'] });
		},
	});
}
