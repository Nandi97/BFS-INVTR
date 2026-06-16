"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Info, CheckCircle2 } from "lucide-react";
import { useReorder, type ReorderRow, type ReorderUrgency } from "@/hooks/use-reorder";
import { useLocations } from "@/hooks/use-locations";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SetThresholdsForm } from "@/components/stock/dashboard/set-thresholds-form";
import type { InventoryRow } from "@/hooks/use-stock";

const URGENCY_CONFIG: Record<ReorderUrgency, { label: string; className: string }> = {
  out:    { label: "Out of Stock", className: "border-destructive text-destructive" },
  urgent: { label: "Reorder Now",  className: "border-amber-500 text-amber-600 dark:text-amber-400" },
  low:    { label: "Low Stock",    className: "border-yellow-500 text-yellow-600 dark:text-yellow-400" },
  ok:     { label: "OK",           className: "border-emerald-500 text-emerald-600" },
};

function UrgencyBadge({ urgency }: { urgency: ReorderUrgency }) {
  const cfg = URGENCY_CONFIG[urgency];
  return (
    <Badge variant="outline" className={cn("text-xs whitespace-nowrap", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

function MonthsCell({ months }: { months: number | null }) {
  if (months === null) return <span className="text-muted-foreground text-sm">—</span>;
  const color =
    months <= 0
      ? "text-destructive font-medium"
      : months <= 1
      ? "text-amber-600 dark:text-amber-400 font-medium"
      : months <= 2
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-muted-foreground";
  return <span className={cn("font-mono text-sm", color)}>{months.toFixed(1)} mo</span>;
}

function toInventoryRow(r: ReorderRow): InventoryRow {
  return {
    id: r.inventoryId,
    productId: r.productId,
    locationId: r.locationId,
    quantity: r.quantity,
    minQuantity: r.minQuantity,
    reorderPoint: r.reorderPoint,
    reorderQty: r.reorderQty,
    updatedAt: "",
    product: {
      id: r.product.id,
      name: r.product.name,
      sku: r.product.sku,
      barcode: r.product.barcode,
      unit: r.product.unit,
      brand: r.product.brand,
    },
    location: r.location,
  };
}

export function ReorderTable({ includeInactive = false }: { includeInactive?: boolean }) {
  const [search, setSearch] = useState("");
  const [urgency, setUrgency] = useState<"all" | "urgent" | "low">("all");
  const [locationId, setLocationId] = useState("all");
  const [thresholdRow, setThresholdRow] = useState<InventoryRow | null>(null);

  const { data, isLoading } = useReorder({
    search: search || undefined,
    urgency,
    locationId: locationId === "all" ? undefined : locationId,
    includeInactive,
  });

  const { data: locations } = useLocations({ active: !includeInactive });
  const rows = data?.data ?? [];

  const urgentCount = rows.filter((r) => r.urgency === "out" || r.urgency === "urgent").length;
  const lowCount = rows.filter((r) => r.urgency === "low").length;

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => setUrgency("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              urgency === "all"
                ? "bg-foreground text-background border-foreground"
                : "border-border hover:border-foreground/40"
            )}
          >
            All attention items · {data?.total ?? 0}
          </button>
          <button
            onClick={() => setUrgency("urgent")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              urgency === "urgent"
                ? "bg-destructive text-destructive-foreground border-destructive"
                : "border-destructive/40 text-destructive hover:border-destructive"
            )}
          >
            Urgent · {urgentCount}
          </button>
          <button
            onClick={() => setUrgency("low")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              urgency === "low"
                ? "bg-amber-500 text-white border-amber-500"
                : "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:border-amber-500"
            )}
          >
            Low Stock · {lowCount}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations?.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Reorder At</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  Avg / mo
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>Average monthly consumption from sales records</TooltipContent>
                  </Tooltip>
                </div>
              </TableHead>
              <TableHead className="text-right">Months Left</TableHead>
              <TableHead className="text-right">Suggest Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-8 text-emerald-500 mb-1" />
                    <span className="font-medium text-sm">All stock levels are healthy</span>
                    <span className="text-xs">
                      No products are below their reorder point right now.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.inventoryId}
                  className={cn(
                    row.urgency === "out" && "bg-destructive/5 dark:bg-destructive/10",
                    row.urgency === "urgent" && "bg-amber-500/5 dark:bg-amber-500/10"
                  )}
                >
                  <TableCell>
                    <div className="font-medium text-sm">{row.product.name}</div>
                    {row.product.sku && (
                      <div className="text-xs font-mono text-muted-foreground">{row.product.sku}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.product.brand?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{row.location.name}</TableCell>
                  <TableCell className={cn(
                    "text-right font-mono font-medium",
                    row.quantity <= 0 ? "text-destructive" : ""
                  )}>
                    {row.quantity}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {row.reorderPoint || "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {row.avgMonthly > 0 ? row.avgMonthly : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <MonthsCell months={row.monthsRemaining} />
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-sm">
                    {row.suggestedOrderQty ?? "—"}
                  </TableCell>
                  <TableCell>
                    <UrgencyBadge urgency={row.urgency} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setThresholdRow(toInventoryRow(row))}
                    >
                      Thresholds
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {rows.length} product{rows.length !== 1 ? "s" : ""} need attention
        </p>
      )}

      <SetThresholdsForm
        open={!!thresholdRow}
        onOpenChange={(o) => !o && setThresholdRow(null)}
        row={thresholdRow}
      />
    </div>
  );
}
