"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface StockValuationRow {
  productId:    string;
  locationId:   string;
  productName:  string;
  sku:          string | null;
  brand:        string | null;
  category:     string | null;
  location:     string;
  locationCode: string;
  quantity:     number;
  reorderPoint: number;
  unitCost:     number;
  totalValue:   number;
  supplierName: string | null;
}

export interface LowStockRow {
  productId:     string;
  productName:   string;
  sku:           string | null;
  brand:         string | null;
  category:      string | null;
  location:      string;
  locationCode:  string;
  quantity:      number;
  reorderPoint:  number;
  reorderQty:    number;
  shortage:      number;
  isOut:         boolean;
  supplier:      string | null;
  supplierEmail: string | null;
  leadTimeDays:  number | null;
  supplierSku:   string | null;
  unitCost:      number | null;
}

export interface MovementRow {
  id:           string;
  createdAt:    string;
  productName:  string;
  sku:          string | null;
  brand:        string | null;
  location:     string;
  locationCode: string;
  type:         string;
  quantity:     number;
  balanceAfter: number;
  reference:    string | null;
  notes:        string | null;
}

export interface PoReportRow {
  id:            string;
  poNumber:      string;
  createdAt:     string;
  sentAt:        string | null;
  receivedAt:    string | null;
  supplier:      string;
  location:      string;
  locationCode:  string;
  status:        string;
  lineItems:     number;
  totalOrdered:  number;
  totalReceived: number;
  totalCost:     number;
}

function buildParams(obj: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v) p.set(k, v);
  }
  return p.toString();
}

export function useStockValuationReport(filters: { locationId?: string; brandId?: string } = {}) {
  return useQuery({
    queryKey: ["report", "stock-valuation", filters],
    queryFn: async () => {
      const { data } = await api.get<{
        data:       StockValuationRow[];
        totalValue: number;
        totalUnits: number;
      }>(`/reports/stock-valuation?${buildParams(filters)}`);
      return data;
    },
  });
}

export function useLowStockReport(filters: { locationId?: string; brandId?: string } = {}) {
  return useQuery({
    queryKey: ["report", "low-stock", filters],
    queryFn: async () => {
      const { data } = await api.get<{
        data:       LowStockRow[];
        outOfStock: number;
        lowStock:   number;
        total:      number;
      }>(`/reports/low-stock?${buildParams(filters)}`);
      return data;
    },
  });
}

export function useMovementsReport(filters: {
  from?:       string;
  to?:         string;
  locationId?: string;
  brandId?:    string;
  type?:       string;
} = {}) {
  return useQuery({
    queryKey: ["report", "movements", filters],
    queryFn: async () => {
      const { data } = await api.get<{
        data:     MovementRow[];
        totalIn:  number;
        totalOut: number;
        total:    number;
      }>(`/reports/movements?${buildParams(filters)}`);
      return data;
    },
  });
}

export function usePoReport(filters: {
  from?:        string;
  to?:          string;
  supplierId?:  string;
  status?:      string;
} = {}) {
  return useQuery({
    queryKey: ["report", "purchase-orders", filters],
    queryFn: async () => {
      const { data } = await api.get<{
        data:         PoReportRow[];
        grandTotal:   number;
        totalOrdered: number;
        total:        number;
      }>(`/reports/purchase-orders?${buildParams(filters)}`);
      return data;
    },
  });
}
