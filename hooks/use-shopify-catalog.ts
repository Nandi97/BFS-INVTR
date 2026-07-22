'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface ShopifyCreationCandidate {
	productId: string;
	name: string;
	sku: string | null;
	barcode: string | null;
	brand: string | null;
	category: string | null;
	salePrice: number | null;
	description: string | null;
	imageUrl: string | null;
	stockQty: number;
	needsPrice: boolean;
}

export interface MissingShopifyProductsResult {
	candidates: ShopifyCreationCandidate[];
	reconciled: number;
}

const KEY = (shop: string) => ['shopify-missing-products', shop];

export function useMissingShopifyProducts(shop: string, enabled = true) {
	return useQuery({
		queryKey: KEY(shop),
		queryFn: () =>
			api
				.get<MissingShopifyProductsResult>(
					'/integrations/shopify/missing-products',
					{ params: { shop } }
				)
				.then((r) => r.data),
		enabled: enabled && !!shop,
	});
}

export interface CreateShopifyProductsItem {
	productId: string;
	price: number;
	title?: string;
	description?: string;
	imageUrl?: string;
}

export interface CreateShopifyProductsResult {
	created: number;
	errors: string[];
}

export function useCreateShopifyProducts() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			shop,
			items,
		}: {
			shop: string;
			items: CreateShopifyProductsItem[];
		}) =>
			api
				.post<CreateShopifyProductsResult>(
					'/integrations/shopify/create-products',
					{ shop, items }
				)
				.then((r) => r.data),
		onSuccess: (_data, variables) => {
			qc.invalidateQueries({ queryKey: KEY(variables.shop) });
		},
	});
}
