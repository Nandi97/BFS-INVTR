'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export type LocationType = 'WAREHOUSE' | 'RETAIL' | 'VIRTUAL';

export interface Location {
	id: string;
	name: string;
	code: string;
	type: LocationType;
	address: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	_count?: { inventory: number };
}

export interface CreateLocationInput {
	name: string;
	code: string;
	type?: LocationType;
	address?: string;
}

const LOCATIONS_KEY = ['locations'];

export function useLocations(params?: {
	type?: LocationType;
	active?: boolean;
}) {
	return useQuery({
		queryKey: [...LOCATIONS_KEY, params],
		queryFn: async () => {
			const search = new URLSearchParams();
			if (params?.type) search.set('type', params.type);
			if (params?.active !== undefined)
				search.set('active', String(params.active));
			const { data } = await api.get<Location[]>(`/locations?${search}`);
			return data;
		},
	});
}

export function useCreateLocation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateLocationInput) =>
			api.post<Location>('/locations', input).then((r) => r.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: LOCATIONS_KEY }),
	});
}

export function useUpdateLocation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, ...data }: Partial<Location> & { id: string }) =>
			api.put<Location>(`/locations/${id}`, data).then((r) => r.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: LOCATIONS_KEY }),
	});
}

export function useDeleteLocation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/locations/${id}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: LOCATIONS_KEY }),
	});
}
