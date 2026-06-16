"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useEmailLogs, type EmailStatus, type AlertType } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<EmailStatus, { label: string; icon: React.ElementType; className: string }> = {
  SENT:    { label: "Sent",    icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  FAILED:  { label: "Failed",  icon: XCircle,      className: "text-destructive" },
  PENDING: { label: "Pending", icon: Clock,        className: "text-muted-foreground" },
};

const TYPE_LABELS: Record<AlertType, string> = {
  OUT_OF_STOCK:   "Out of Stock",
  LOW_STOCK:      "Low Stock",
  REORDER_NEEDED: "Reorder Needed",
  DAILY_DIGEST:   "Daily Digest",
  PO_SENT:        "PO Sent",
  PO_RECEIVED:    "PO Received",
};

export function EmailLogTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useEmailLogs(page);

  const rows       = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48">
                  <EmptyState
                    icon={Mail}
                    title="No emails sent yet"
                    description="Email alerts will appear here once a notification rule triggers."
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((log) => {
                const statusCfg = STATUS_CONFIG[log.status];
                const StatusIcon = statusCfg.icon;
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{log.subject}</div>
                      {log.error && (
                        <div className="text-xs text-destructive mt-0.5 truncate max-w-xs">{log.error}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {TYPE_LABELS[log.type] ?? log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex flex-wrap gap-1">
                        {log.recipients.slice(0, 2).map((r) => (
                          <span key={r} className="text-xs">{r}</span>
                        ))}
                        {log.recipients.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{log.recipients.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("flex items-center gap-1 text-xs font-medium", statusCfg.className)}>
                        <StatusIcon className="size-3.5" />
                        {statusCfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{total} emails</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs px-1">{page}/{totalPages}</span>
            <Button variant="outline" size="icon" className="size-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
