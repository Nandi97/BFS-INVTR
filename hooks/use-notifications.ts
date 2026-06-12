"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

export type AlertType =
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "REORDER_NEEDED"
  | "DAILY_DIGEST"
  | "PO_SENT"
  | "PO_RECEIVED";

export type EmailStatus = "PENDING" | "SENT" | "FAILED";

export interface AlertRule {
  id:              string;
  name:            string;
  type:            AlertType;
  recipients:      string[];
  thresholdMonths: number | null;
  isActive:        boolean;
  lastTriggeredAt: string | null;
  createdAt:       string;
  updatedAt:       string;
}

export interface EmailLog {
  id:         string;
  type:       AlertType;
  subject:    string;
  recipients: string[];
  status:     EmailStatus;
  error:      string | null;
  sentAt:     string | null;
  createdAt:  string;
}

export interface CreateRuleInput {
  name:            string;
  type:            AlertType;
  recipients:      string;
  thresholdMonths?: number;
}

const RULES_KEY = ["notification-rules"];
const LOGS_KEY  = ["notification-logs"];

export function useAlertRules() {
  return useQuery({
    queryKey: RULES_KEY,
    queryFn:  () => api.get<AlertRule[]>("/notifications/rules").then((r) => r.data),
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRuleInput) =>
      api.post<AlertRule>("/notifications/rules", input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: RULES_KEY }),
  });
}

interface UpdateRuleInput {
  id:              string;
  name?:           string;
  type?:           AlertType;
  recipients?:     string;
  thresholdMonths?: number;
  isActive?:       boolean;
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateRuleInput) =>
      api.put<AlertRule>(`/notifications/rules/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: RULES_KEY }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: RULES_KEY }),
  });
}

export function useEmailLogs(page = 1) {
  return useQuery({
    queryKey: [...LOGS_KEY, page],
    queryFn:  () =>
      api
        .get<{ data: EmailLog[]; total: number; page: number; limit: number }>(
          `/notifications/logs?page=${page}&limit=20`
        )
        .then((r) => r.data),
  });
}

export function useSendTestEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      api.post<{ ok: boolean; message: string }>("/notifications/test", { email }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: LOGS_KEY }),
  });
}

export function useRunAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api
        .post<{ processed: number; sent: number; skipped: number; errors: string[] }>(
          "/notifications/run"
        )
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: LOGS_KEY }),
  });
}
