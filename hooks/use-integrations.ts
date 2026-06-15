"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export interface QbConfig {
  companyName:     string;
  defaultLocation: string;
  notes:           string;
}

export interface QbConnectionStatus {
  config:          QbConfig;
  isActive:        boolean;
  lastSyncAt:      string | null;
  connected:       boolean;
  realmId:         string | null;
  tokenExpiresAt:  string | null;
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

export interface XlsImportResult extends SyncResult {
  file: string;
  synced: number;
}

const QB_CONFIG_KEY = ["integrations", "qb-config"];
const SYNC_LOGS_KEY = ["integrations", "sync-logs"];

export function useQbConfig() {
  return useQuery({
    queryKey: QB_CONFIG_KEY,
    queryFn:  () =>
      api
        .get<QbConnectionStatus>("/integrations/quickbooks/config")
        .then((r) => r.data),
  });
}

export function useQbDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/integrations/quickbooks/disconnect").then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QB_CONFIG_KEY }),
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

export function useQbXlsFile() {
  return useQuery({
    queryKey: ["integrations", "xls-file"],
    queryFn:  () =>
      api
        .get<{ file: string | null; dir: string }>("/integrations/quickbooks/import-xls")
        .then((r) => r.data),
  });
}

export function useQbImportXls() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (location: string) =>
      api
        .post<XlsImportResult>("/integrations/quickbooks/import-xls", { location })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SYNC_LOGS_KEY });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["reorder"] });
      qc.invalidateQueries({ queryKey: ["integrations", "xls-file"] });
    },
  });
}

export function useQbApiSyncStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (location?: string) =>
      api
        .post<SyncResult>("/integrations/quickbooks/items", { location: location ?? "BF Warehouse" })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SYNC_LOGS_KEY });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["reorder"] });
    },
  });
}

export function useQbApiSyncSales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api
        .post<SyncResult & { period?: { from: string; to: string } }>("/integrations/quickbooks/sync-sales-api")
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
