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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowLeftRight } from "lucide-react";
import { useStockMovements, type StockMovementType } from "@/hooks/use-stock";
import { useLocations } from "@/hooks/use-locations";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const MOVEMENT_COLORS: Record<StockMovementType, string> = {
  PURCHASE_RECEIPT:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ADJUSTMENT_IN:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ADJUSTMENT_OUT:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  OPENING_STOCK:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  RECONCILIATION:    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SALE:              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TRANSFER_IN:       "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  TRANSFER_OUT:      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  PURCHASE_RECEIPT: "Receipt",
  ADJUSTMENT_IN:    "Adj +",
  ADJUSTMENT_OUT:   "Adj −",
  OPENING_STOCK:    "Opening",
  RECONCILIATION:   "Reconcile",
  SALE:             "Sale",
  TRANSFER_IN:      "Transfer In",
  TRANSFER_OUT:     "Transfer Out",
};

const SUBTRACT_TYPES: StockMovementType[] = ["SALE", "ADJUSTMENT_OUT", "TRANSFER_OUT"];

export function MovementsTable({ locationId: defaultLocationId }: { locationId?: string }) {
  const [locationId, setLocationId] = useState(defaultLocationId ?? "all");
  const [type, setType] = useState<"all" | StockMovementType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data, isLoading } = useStockMovements({
    locationId: locationId === "all" ? undefined : locationId,
    type: type === "all" ? undefined : type,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit,
  });

  const { data: locations } = useLocations({ active: true });
  const rows = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
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

        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(MOVEMENT_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36"
          placeholder="To"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48">
                  <EmptyState
                    icon={ArrowLeftRight}
                    title="No movements found"
                    description="Stock adjustments, receipts, and sales will appear here once recorded."
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((m) => {
                const isSubtract = SUBTRACT_TYPES.includes(m.type);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(m.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{m.product.name}</div>
                      {m.product.brand && (
                        <div className="text-xs text-muted-foreground">{m.product.brand.name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{m.location.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", MOVEMENT_COLORS[m.type])}
                      >
                        {MOVEMENT_LABEL[m.type]}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono font-medium",
                        isSubtract ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {isSubtract ? "−" : "+"}{m.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {m.balanceAfter}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.user?.name ?? "System"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {data?.total} records
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
