"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export type StockStatus = "all" | "low" | "out";
export type StockMovementType =
  | "PURCHASE_RECEIPT"
  | "SALE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "OPENING_STOCK"
  | "RECONCILIATION";

export interface InventoryRow {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  minQuantity: number;
  reorderPoint: number;
  reorderQty: number;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    unit: string;
    brand: { id: string; name: string } | null;
  };
  location: { id: string; name: string; code: string };
}

export interface StockMovement {
  id: string;
  productId: string;
  locationId: string;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  product: {
    name: string;
    sku: string | null;
    brand: { name: string } | null;
  };
  location: { name: string; code: string };
  user: { id: string; name: string } | null;
}

export interface StockFilters {
  locationId?: string;
  search?: string;
  status?: StockStatus;
  page?: number;
  limit?: number;
}

export interface MovementsSummary {
  totalIn:  number;
  totalOut: number;
}

export interface ProductMovementSummary {
  productId:     string;
  productName:   string;
  brandName:     string | null;
  totalIn:       number;
  totalOut:      number;
  netChange:     number;
  movementCount: number;
  lastMovement:  string;
  currentStock:  number;
}

export interface MovementsFilters {
  locationId?: string;
  productId?:  string;
  brandId?:    string;
  type?:       StockMovementType;
  dateFrom?:   string;
  dateTo?:     string;
  page?:       number;
  limit?:      number;
}

export interface AdjustStockInput {
  productId: string;
  locationId: string;
  type: StockMovementType;
  quantity: number;
  reference?: string;
  notes?: string;
}

export interface SetThresholdsInput {
  productId: string;
  locationId: string;
  minQuantity?: number;
  reorderPoint?: number;
  reorderQty?: number;
}

const STOCK_KEY = ["stock"];
const MOVEMENTS_KEY = ["stock", "movements"];

export function useStock(filters: StockFilters = {}) {
  return useQuery({
    queryKey: [...STOCK_KEY, filters],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filters.locationId) p.set("locationId", filters.locationId);
      if (filters.search) p.set("search", filters.search);
      if (filters.status) p.set("status", filters.status);
      if (filters.page) p.set("page", String(filters.page));
      if (filters.limit) p.set("limit", String(filters.limit));
      const { data } = await api.get<{ data: InventoryRow[]; total: number; page: number; limit: number }>(
        `/stock?${p}`
      );
      return data;
    },
  });
}

export function useStockMovements(filters: MovementsFilters = {}) {
  return useQuery({
    queryKey: [...MOVEMENTS_KEY, filters],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filters.locationId) p.set("locationId", filters.locationId);
      if (filters.productId)  p.set("productId",  filters.productId);
      if (filters.brandId)    p.set("brandId",    filters.brandId);
      if (filters.type)       p.set("type",       filters.type);
      if (filters.dateFrom)   p.set("dateFrom",   filters.dateFrom);
      if (filters.dateTo)     p.set("dateTo",     filters.dateTo);
      if (filters.page)       p.set("page",       String(filters.page));
      if (filters.limit)      p.set("limit",      String(filters.limit));
      const { data } = await api.get<{
        data: StockMovement[];
        total: number;
        page: number;
        limit: number;
        summary: MovementsSummary;
      }>(`/stock/movements?${p}`);
      return data;
    },
  });
}

export function useStockMovementsSummary(
  filters: Omit<MovementsFilters, "type" | "page" | "limit"> & { typeGroup?: "in" | "out" } = {}
) {
  return useQuery({
    queryKey: [...MOVEMENTS_KEY, "summary", filters],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filters.locationId) p.set("locationId", filters.locationId);
      if (filters.brandId)    p.set("brandId",    filters.brandId);
      if (filters.dateFrom)   p.set("dateFrom",   filters.dateFrom);
      if (filters.dateTo)     p.set("dateTo",     filters.dateTo);
      if (filters.typeGroup)  p.set("typeGroup",  filters.typeGroup);
      const { data } = await api.get<{ data: ProductMovementSummary[]; total: number }>(
        `/stock/movements/summary?${p}`
      );
      return data;
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustStockInput) =>
      api.post("/stock/adjust", input).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_KEY });
      qc.invalidateQueries({ queryKey: MOVEMENTS_KEY });
    },
  });
}

export function useSetThresholds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetThresholdsInput) =>
      api.put("/stock/thresholds", input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: STOCK_KEY }),
  });
}
