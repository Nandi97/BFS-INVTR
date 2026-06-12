"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "sonner";

export interface Brand {
  id:           string;
  name:         string;
  leadTimeDays: number;
  createdAt:    string;
  updatedAt:    string;
  _count:       { products: number };
}

export function useBrands() {
  return useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn:  () => api.get<Brand[]>("/brands").then((r) => r.data),
  });
}

export function useUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; leadTimeDays?: number }) =>
      api.put<Brand>(`/brands/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      qc.invalidateQueries({ queryKey: ["settings", "stock-policy"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<Brand>("/brands", { name }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/brands/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
