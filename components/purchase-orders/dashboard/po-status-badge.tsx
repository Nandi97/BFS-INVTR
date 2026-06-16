import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { POStatus } from "@/hooks/use-purchase-orders";

const STATUS_CONFIG: Record<POStatus, { label: string; className: string }> = {
  DRAFT:               { label: "Draft",              className: "border-border text-muted-foreground" },
  SENT:                { label: "Sent",                className: "border-blue-500 text-blue-600 dark:text-blue-400" },
  PARTIALLY_RECEIVED:  { label: "Part. Received",      className: "border-amber-500 text-amber-600 dark:text-amber-400" },
  RECEIVED:            { label: "Received",            className: "border-emerald-500 text-emerald-600 dark:text-emerald-400" },
  CANCELLED:           { label: "Cancelled",           className: "border-destructive text-destructive" },
};

export function POStatusBadge({ status }: { status: POStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <Badge variant="outline" className={cn("text-xs whitespace-nowrap", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}
