'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { toast } from 'sonner';

export interface ProductFilters {
	search?: string;
	brandId?: string;
	categoryId?: string;
	isActive?: boolean;
	productType?: string;
	page?: number;
	limit?: number;
}

export function useProducts(filters: ProductFilters = {}) {
	const params = new URLSearchParams();
	if (filters.search) params.set('search', filters.search);
	if (filters.brandId) params.set('brandId', filters.brandId);
	if (filters.categoryId) params.set('categoryId', filters.categoryId);
	if (filters.isActive !== undefined)
		params.set('isActive', String(filters.isActive));
	if (filters.productType) params.set('productType', filters.productType);
	if (filters.page) params.set('page', String(filters.page));
	if (filters.limit) params.set('limit', String(filters.limit));

	return useQuery({
		queryKey: ['products', filters],
		queryFn: () => api.get(`/products?${params}`).then((r) => r.data),
	});
}

export interface MinimalProduct {
	id: string;
	name: string;
	sku: string | null;
	brandName: string | null;
}

export function useProductsMinimal() {
	return useQuery<MinimalProduct[]>({
		queryKey: ['products', 'minimal'],
		queryFn: () => api.get('/products?minimal=true').then((r) => r.data),
		staleTime: 5 * 60 * 1000, // 5 min — product list changes infrequently
	});
}

export function useProduct(id: string) {
	return useQuery({
		queryKey: ['products', id],
		queryFn: () => api.get(`/products/${id}`).then((r) => r.data),
		enabled: !!id,
	});
}

export function useCreateProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			api.post('/products', data).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['products'] });
			toast.success('Product created');
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useUpdateProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...data
		}: Record<string, unknown> & { id: string }) =>
			api.put(`/products/${id}`, data).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['products'] });
			toast.success('Product updated');
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export interface PendingProduct {
	id: string;
	qboItemId: string;
	qboName: string;
	qboSku: string | null;
	qtyOnHand: number;
	purchaseCost: number | null;
	suggestedBrandId: string | null;
	suggestedBrandName: string | null;
	firstSeenAt: string;
	lastSeenAt: string;
	seenCount: number;
	ignored: boolean;
}

export interface ApproveInput {
	name: string;
	brandId?: string;
	categoryId?: string;
	sku?: string;
	barcode?: string;
	unit: string;
	locationId: string;
}

export function usePendingProducts(showIgnored = false) {
	return useQuery({
		queryKey: ['products', 'pending', { showIgnored }],
		queryFn: () =>
			api
				.get<{
					data: PendingProduct[];
					total: number;
					ignoredCount: number;
				}>('/products/pending', {
					params: showIgnored ? { showIgnored: 'true' } : {},
				})
				.then((r) => r.data),
	});
}

export function useApprovePendingProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...data }: ApproveInput & { id: string }) =>
			api
				.post(`/products/pending/${id}/approve`, data)
				.then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['products'] });
			toast.success('Product added to inventory');
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useDismissPendingProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			api.delete(`/products/pending/${id}`).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['products', 'pending'] });
			toast.success('Item dismissed');
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useIgnorePendingProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ignored }: { id: string; ignored: boolean }) =>
			api
				.patch(`/products/pending/${id}`, { ignored })
				.then((r) => r.data),
		onSuccess: (_data, { ignored }) => {
			qc.invalidateQueries({ queryKey: ['products', 'pending'] });
			toast.success(
				ignored ? 'Item permanently ignored' : 'Item restored'
			);
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useBatchIgnorePendingProducts() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ ids, ignored }: { ids: string[]; ignored: boolean }) =>
			api
				.patch('/products/pending/batch', { ids, ignored })
				.then((r) => r.data as { updated: number }),
		onSuccess: (data, { ignored }) => {
			qc.invalidateQueries({ queryKey: ['products', 'pending'] });
			toast.success(
				ignored
					? `${data.updated} item${data.updated === 1 ? '' : 's'} permanently ignored`
					: `${data.updated} item${data.updated === 1 ? '' : 's'} restored`
			);
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export interface BatchApproveInput {
	ids: string[];
	locationId: string;
	brandId?: string;
	categoryId?: string;
	unit?: string;
}

export function useBatchDismissPendingProducts() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (ids: string[]) =>
			api
				.delete('/products/pending/batch', { data: { ids } })
				.then((r) => r.data as { dismissed: number }),
		onSuccess: (data) => {
			qc.invalidateQueries({ queryKey: ['products', 'pending'] });
			toast.success(
				`${data.dismissed} item${data.dismissed === 1 ? '' : 's'} dismissed`
			);
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useBatchApprovePendingProducts() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: BatchApproveInput) =>
			api.post('/products/pending/batch', data).then(
				(r) =>
					r.data as {
						approved: number;
						errors: { id: string; name: string; reason: string }[];
					}
			),
		onSuccess: (data) => {
			qc.invalidateQueries({ queryKey: ['products'] });
			if (data.errors.length > 0) {
				toast.warning(
					`${data.approved} added, ${data.errors.length} skipped (SKU conflicts)`
				);
			} else {
				toast.success(
					`${data.approved} product${data.approved === 1 ? '' : 's'} added to inventory`
				);
			}
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useArchiveProduct() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			api.delete(`/products/${id}`).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['products'] });
			toast.success('Product archived');
		},
		onError: (err: Error) => toast.error(err.message),
	});
}
