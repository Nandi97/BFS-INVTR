"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "sonner";

export interface ProductFilters {
  search?:      string;
  brandId?:     string;
  categoryId?:  string;
  isActive?:    boolean;
  productType?: string;
  page?:        number;
  limit?:       number;
}

export function useProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search)      params.set("search",      filters.search);
  if (filters.brandId)     params.set("brandId",     filters.brandId);
  if (filters.categoryId)  params.set("categoryId",  filters.categoryId);
  if (filters.isActive    !== undefined) params.set("isActive",    String(filters.isActive));
  if (filters.productType) params.set("productType", filters.productType);
  if (filters.page)        params.set("page",        String(filters.page));
  if (filters.limit)       params.set("limit",       String(filters.limit));

  return useQuery({
    queryKey: ["products", filters],
    queryFn:  () => api.get(`/products?${params}`).then((r) => r.data),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn:  () => api.get(`/products/${id}`).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/products", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) =>
      api.put(`/products/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useArchiveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product archived");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
