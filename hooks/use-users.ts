'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface AppUser {
	id: string;
	name: string;
	email: string;
	image: string | null;
	role: 'ADMIN' | 'MANAGER' | 'VIEWER';
	createdAt: string;
	lastSeenAt: string | null;
}

const USERS_KEY = ['users'];

export function useUsers() {
	return useQuery({
		queryKey: USERS_KEY,
		queryFn: () => api.get<AppUser[]>('/users').then((r) => r.data),
	});
}

export function useUpdateUserRole() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, role }: { id: string; role: AppUser['role'] }) =>
			api.patch<AppUser>(`/users/${id}`, { role }).then((r) => r.data),
		onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
	});
}
