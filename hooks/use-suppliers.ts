"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface Supplier {
  id:           string;
  name:         string;
  contactName:  string | null;
  email:        string | null;
  phone:        string | null;
  address:      string | null;
  leadTimeDays: number;
  notes:        string | null;
  isActive:     boolean;
  createdAt:    string;
  updatedAt:    string;
  _count?: { productSuppliers: number; purchaseOrders: number };
}

export interface CreateSupplierInput {
  name:          string;
  contactName?:  string;
  email?:        string;
  phone?:        string;
  address?:      string;
  leadTimeDays?: number;
  notes?:        string;
}

export interface SupplierFilters {
  search?: string;
  active?: boolean;
  page?:   number;
  limit?:  number;
}

const SUPPLIERS_KEY = ["suppliers"];

export function useSuppliers(filters: SupplierFilters = {}) {
  return useQuery({
    queryKey: [...SUPPLIERS_KEY, filters],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filters.search) p.set("search", filters.search);
      if (filters.active !== undefined) p.set("active", String(filters.active));
      if (filters.page)  p.set("page",  String(filters.page));
      if (filters.limit) p.set("limit", String(filters.limit));
      const { data } = await api.get<{ data: Supplier[]; total: number; page: number; limit: number }>(
        `/suppliers?${p}`
      );
      return data;
    },
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: [...SUPPLIERS_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<Supplier>(`/suppliers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupplierInput) =>
      api.post<Supplier>("/suppliers", input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Supplier> & { id: string }) =>
      api.put<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });
}
