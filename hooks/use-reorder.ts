'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type ReorderUrgency = 'out' | 'urgent' | 'low' | 'ok';

export interface ReorderRow {
	inventoryId: string;
	productId: string;
	locationId: string;
	product: {
		id: string;
		name: string;
		sku: string | null;
		barcode: string | null;
		unit: string;
		brand: { id: string; name: string } | null;
		category: { id: string; name: string } | null;
	};
	location: { id: string; name: string; code: string };
	quantity: number;
	minQuantity: number;
	reorderPoint: number;
	reorderQty: number;
	avgMonthly: number;
	monthsRemaining: number | null;
	suggestedOrderQty: number | null;
	urgency: ReorderUrgency;
	salesMonths: number;
	confident: boolean;
}

export interface ReorderFilters {
	locationId?: string;
	urgency?: 'all' | 'urgent' | 'low';
	search?: string;
	includeInactive?: boolean;
}

export function useReorder(filters: ReorderFilters = {}) {
	return useQuery({
		queryKey: ['reorder', filters],
		queryFn: async () => {
			const p = new URLSearchParams();
			if (filters.locationId) p.set('locationId', filters.locationId);
			if (filters.urgency) p.set('urgency', filters.urgency);
			if (filters.search) p.set('search', filters.search);
			if (filters.includeInactive) p.set('includeInactive', 'true');
			const { data } = await api.get<{
				data: ReorderRow[];
				total: number;
			}>(`/reorder?${p}`);
			return data;
		},
	});
}

export function useCalculateMinimums() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (locationId?: string) =>
			api
				.post<{
					updated: number;
					skipped: number;
					total: number;
				}>(
					'/inventory/calculate-minimums',
					locationId ? { locationId } : {}
				)
				.then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['reorder'] });
			qc.invalidateQueries({ queryKey: ['stock'] });
		},
	});
}
