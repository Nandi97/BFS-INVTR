'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export function useZenotiOrders() {
	return useQuery({
		queryKey: ['zenoti-orders'],
		queryFn: () => api.get('/zenoti/orders').then((r) => r.data),
	});
}

export function useZenotiOrder(id: string) {
	return useQuery({
		queryKey: ['zenoti-order', id],
		queryFn: () => api.get(`/zenoti/orders/${id}`).then((r) => r.data),
		enabled: !!id,
	});
}

export function useCreateFulfillment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (orderId: string) =>
			api
				.post(`/zenoti/orders/${orderId}/fulfillment`)
				.then((r) => r.data),
		onSuccess: (_data, orderId) => {
			qc.invalidateQueries({ queryKey: ['zenoti-order', orderId] });
			qc.invalidateQueries({ queryKey: ['zenoti-orders'] });
		},
	});
}

export function useUpdateFulfillmentItem() {
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
			fulfilledRetailQty?: number;
			fulfilledConsumableQty?: number;
			isPacked?: boolean;
			notes?: string;
		}) =>
			api
				.patch(
					`/zenoti/fulfillments/${fulfillmentId}/items/${itemId}`,
					data
				)
				.then((r) => r.data),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['zenoti-order', vars.orderId] });
		},
	});
}

export function useAddWalkInItem() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			fulfillmentId,
			orderId,
			...data
		}: {
			fulfillmentId: string;
			orderId: string;
			productCode?: string;
			productName: string;
			requestedRetailQty?: number;
			requestedConsumableQty?: number;
			fulfilledRetailQty?: number;
			fulfilledConsumableQty?: number;
		}) =>
			api
				.post(`/zenoti/fulfillments/${fulfillmentId}/items`, data)
				.then((r) => r.data),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['zenoti-order', vars.orderId] });
		},
	});
}

export function useDeleteWalkInItem() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			fulfillmentId,
			itemId,
		}: {
			fulfillmentId: string;
			itemId: string;
			orderId: string;
		}) =>
			api
				.delete(`/zenoti/fulfillments/${fulfillmentId}/items/${itemId}`)
				.then((r) => r.data),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['zenoti-order', vars.orderId] });
		},
	});
}

export function useSubmitFulfillment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			fulfillmentId,
		}: {
			fulfillmentId: string;
			orderId: string;
		}) =>
			api
				.post(`/zenoti/fulfillments/${fulfillmentId}/submit`)
				.then((r) => r.data),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['zenoti-order', vars.orderId] });
			qc.invalidateQueries({ queryKey: ['zenoti-orders'] });
		},
	});
}

export function useSendPackingListEmail() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			fulfillmentId,
			orderId,
		}: {
			fulfillmentId: string;
			orderId: string;
		}) =>
			api
				.post(`/zenoti/fulfillments/${fulfillmentId}/send-email`)
				.then((r) => r.data),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['zenoti-order', vars.orderId] });
		},
	});
}

export function useSendOrderNotification() {
	return useMutation({
		mutationFn: (orderId: string) =>
			api.post(`/zenoti/orders/${orderId}/notify`).then((r) => r.data),
	});
}

export function useSyncZenoti() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => api.post('/zenoti/sync').then((r) => r.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['zenoti-orders'] }),
	});
}

export function useImportZenotiExcel() {
	const qc = useQueryClient();
	return useMutation({
		// Use fetch so the browser sets Content-Type: multipart/form-data with the correct boundary.
		// The api instance has Content-Type: application/json as default which would override FormData.
		mutationFn: async (formData: FormData) => {
			const res = await fetch('/api/zenoti/import-excel', {
				method: 'POST',
				body: formData,
				credentials: 'include',
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Import failed');
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ['zenoti-orders'] }),
	});
}

export function useScanZenotiUploads() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (org: 'bfs' | 'bl') =>
			api.post(`/zenoti/scan-uploads?org=${org}`).then((r) => r.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['zenoti-orders'] }),
	});
}
