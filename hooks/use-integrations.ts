"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface QbConfig {
  companyName:     string;
  defaultLocation: string;
  notes:           string;
}

export interface SyncLog {
  id:         string;
  provider:   string;
  type:       string;
  status:     "SUCCESS" | "PARTIAL" | "FAILED";
  message:    string | null;
  recordsIn:  number;
  recordsOut: number;
  createdAt:  string;
}

export interface SyncResult {
  synced?:  number;
  upserted?: number;
  skipped:  number;
  errors:   string[];
  total:    number;
}

const QB_CONFIG_KEY = ["integrations", "qb-config"];
const SYNC_LOGS_KEY = ["integrations", "sync-logs"];

export function useQbConfig() {
  return useQuery({
    queryKey: QB_CONFIG_KEY,
    queryFn:  () =>
      api
        .get<{ config: QbConfig; isActive: boolean; lastSyncAt: string | null }>(
          "/integrations/quickbooks/config"
        )
        .then((r) => r.data),
  });
}

export function useSaveQbConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<QbConfig>) =>
      api.put("/integrations/quickbooks/config", config).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QB_CONFIG_KEY }),
  });
}

export function useQbSyncStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, location }: { rows: Record<string, string>[]; location: string }) =>
      api
        .post<SyncResult>("/integrations/quickbooks/sync-stock", { rows, location })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SYNC_LOGS_KEY });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["reorder"] });
    },
  });
}

export function useQbSyncSales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Record<string, string>[]) =>
      api
        .post<SyncResult>("/integrations/quickbooks/sync-sales", { rows })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SYNC_LOGS_KEY });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

export function useSyncLogs(provider?: string, page = 1) {
  return useQuery({
    queryKey: [...SYNC_LOGS_KEY, provider, page],
    queryFn:  () => {
      const p = new URLSearchParams({ page: String(page), limit: "20" });
      if (provider) p.set("provider", provider);
      return api
        .get<{ data: SyncLog[]; total: number; page: number; limit: number }>(
          `/integrations/sync-logs?${p}`
        )
        .then((r) => r.data);
    },
  });
}
