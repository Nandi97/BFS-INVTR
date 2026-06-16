"use client";

import { useState } from "react";
import { useSyncLogs, type SyncLog } from "@/hooks/use-integrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusClass: Record<SyncLog["status"], string> = {
  SUCCESS: "bg-green-600 text-white hover:bg-green-600",
  PARTIAL: "bg-secondary text-secondary-foreground",
  FAILED:  "bg-destructive text-destructive-foreground hover:bg-destructive",
};

interface Props { provider?: string }

export function SyncLogTable({ provider }: Props) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSyncLogs(provider, page);

  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const pages = Math.max(1, Math.ceil(total / limit));

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading…</p>;

  if (!data?.data.length) {
    return <p className="text-sm text-muted-foreground py-4">No sync history yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">In</TableHead>
              <TableHead className="text-right">Out</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((log: SyncLog) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs">{log.provider}</TableCell>
                <TableCell className="text-xs">{log.type.replace(/_/g, " ")}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${statusClass[log.status]}`}>
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">{log.recordsIn}</TableCell>
                <TableCell className="text-right text-xs tabular-nums">{log.recordsOut}</TableCell>
                <TableCell className={cn("text-xs max-w-xs truncate", log.status === "FAILED" && "text-destructive")}>
                  {log.message ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span>Page {page} of {pages}</span>
          <Button variant="ghost" size="icon" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
