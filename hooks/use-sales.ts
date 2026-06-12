"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface SalesRecord {
  id:        string;
  productId: string;
  year:      number;
  month:     number;
  quantity:  number;
  revenue:   number;
  source:    string;
  product: {
    id:       string;
    name:     string;
    sku:      string | null;
    brand:    { name: string } | null;
    category: { name: string } | null;
  };
}

export interface MonthlyPoint {
  month:    string;
  monthNum: number;
  quantity: number;
  revenue:  number;
}

export interface TopProduct {
  productId:    string;
  name:         string;
  brand:        string | null;
  sku:          string | null;
  totalQty:     number;
  totalRevenue: number;
  avgMonthly:   number;
}

export interface SalesSummary {
  year:            number;
  monthly:         MonthlyPoint[];
  topProducts:     TopProduct[];
  yoy: {
    thisYear: { qty: number; revenue: number };
    lastYear: { qty: number; revenue: number };
  };
  availableYears:  number[];
  productsTracked: number;
}

export interface SalesImportRow {
  identifier: string;
  year:       number;
  month:      number;
  quantity:   number;
  revenue?:   number;
}

const SUMMARY_KEY = ["sales", "summary"];
const RECORDS_KEY = ["sales", "records"];

export function useSalesSummary(year?: number, brandId?: string) {
  return useQuery({
    queryKey: [...SUMMARY_KEY, year, brandId],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (year)    p.set("year",    String(year));
      if (brandId) p.set("brandId", brandId);
      const { data } = await api.get<SalesSummary>(`/sales/summary?${p}`);
      return data;
    },
  });
}

export function useSalesRecords(filters: {
  year?:       number;
  month?:      number;
  productId?:  string;
  brandId?:    string;
  categoryId?: string;
  page?:       number;
  limit?:      number;
} = {}) {
  return useQuery({
    queryKey: [...RECORDS_KEY, filters],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (filters.year)       p.set("year",       String(filters.year));
      if (filters.month)      p.set("month",       String(filters.month));
      if (filters.productId)  p.set("productId",  filters.productId);
      if (filters.brandId)    p.set("brandId",    filters.brandId);
      if (filters.categoryId) p.set("categoryId", filters.categoryId);
      if (filters.page)       p.set("page",       String(filters.page));
      if (filters.limit)      p.set("limit",      String(filters.limit));
      const { data } = await api.get<{ data: SalesRecord[]; total: number; page: number; limit: number }>(
        `/sales?${p}`
      );
      return data;
    },
  });
}

export function useImportSales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: SalesImportRow[]) =>
      api
        .post<{ imported: number; skipped: number; errors: string[]; total: number }>(
          "/sales/import",
          { rows }
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUMMARY_KEY });
      qc.invalidateQueries({ queryKey: RECORDS_KEY });
      qc.invalidateQueries({ queryKey: ["reorder"] });
    },
  });
}
