"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export type POStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface POItem {
  id:          string;
  orderId:     string;
  productId:   string;
  quantity:    number;
  unitCost:    number | null;
  receivedQty: number;
  notes:       string | null;
  product: {
    id:    string;
    name:  string;
    sku:   string | null;
    unit:  string;
    brand: { name: string } | null;
  };
}

export interface PurchaseOrder {
  id:          string;
  poNumber:    string;
  supplierId:  string;
  locationId:  string;
  status:      POStatus;
  notes:       string | null;
  sentAt:      string | null;
  receivedAt:  string | null;
  createdAt:   string;
  updatedAt:   string;
  supplier:    { id: string; name: string };
  location:    { id: string; name: string; code: string };
  items?:      POItem[];
  createdBy?:  { id: string; name: string } | null;
  _count?:     { items: number };
}

export interface CreatePOInput {
  supplierId: string;
  locationId: string;
  notes?:     string;
  items: {
    productId: string;
    quantity:  number;
    unitCost?: number;
    notes?:    string;
  }[];
}

export interface POFilters {
  status?:     POStatus;
  supplierId?: string;
  locationId?: string;
  page?:       number;
  limit?:      number;
}

const PO_KEY = ["purchase-orders"];

export function usePurchaseOrders(filters: POFilters = {}) {
  return useQuery({
    queryKey: [...PO_KEY, filters],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filters.status)     p.set("status",     filters.status);
      if (filters.supplierId) p.set("supplierId", filters.supplierId);
      if (filters.locationId) p.set("locationId", filters.locationId);
      if (filters.page)       p.set("page",       String(filters.page));
      if (filters.limit)      p.set("limit",      String(filters.limit));
      const { data } = await api.get<{
        data: PurchaseOrder[];
        total: number;
        page: number;
        limit: number;
      }>(`/purchase-orders?${p}`);
      return data;
    },
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: [...PO_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePOInput) =>
      api.post<PurchaseOrder>("/purchase-orders", input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PO_KEY }),
  });
}

export function useUpdatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: POStatus; notes?: string; sentAt?: string }) =>
      api.put<PurchaseOrder>(`/purchase-orders/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PO_KEY });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
  });
}

export function useDeletePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/purchase-orders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: PO_KEY }),
  });
}

export function useReceivePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
      notes,
    }: {
      id: string;
      items: { itemId: string; receivedQty: number }[];
      notes?: string;
    }) =>
      api
        .post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { items, notes })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PO_KEY });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["stock", "movements"] });
    },
  });
}
