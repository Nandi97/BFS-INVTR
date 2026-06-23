'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { toast } from 'sonner';

export function useCategories() {
	return useQuery({
		queryKey: ['categories'],
		queryFn: () => api.get('/categories').then((r) => r.data),
	});
}

export function useCreateCategory() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (name: string) =>
			api.post('/categories', { name }).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['categories'] });
			toast.success('Category created');
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useDeleteCategory() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			api.delete(`/categories/${id}`).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['categories'] });
			toast.success('Category deleted');
		},
		onError: (err: Error) => toast.error(err.message),
	});
}
