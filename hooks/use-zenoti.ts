'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export function useZenotiOrders() {
	return useQuery({
		queryKey: ['zenoti-orders'],
		queryFn: () => axios.get('/zenoti/orders').then((r) => r.data),
	});
}

export function useZenotiOrder(id: string) {
	return useQuery({
		queryKey: ['zenoti-order', id],
		queryFn: () => axios.get(`/zenoti/orders/${id}`).then((r) => r.data),
		enabled: !!id,
	});
}

export function useCreateFulfillment() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (orderId: string) =>
			axios
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
			axios
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
			axios
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
			axios
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
			axios
				.post(`/zenoti/fulfillments/${fulfillmentId}/submit`)
				.then((r) => r.data),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['zenoti-order', vars.orderId] });
			qc.invalidateQueries({ queryKey: ['zenoti-orders'] });
		},
	});
}

export function useSyncZenoti() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => axios.post('/zenoti/sync').then((r) => r.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: ['zenoti-orders'] }),
	});
}
