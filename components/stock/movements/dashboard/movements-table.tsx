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
import { Badge }   from "@/components/ui/badge";
import { Input }   from "@/components/ui/input";
import { Button }  from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  List,
  LayoutList,
  Download,
  PackagePlus,
} from "lucide-react";
import {
  useStockMovements,
  useStockMovementsSummary,
  type StockMovementType,
  type ProductMovementSummary,
} from "@/hooks/use-stock";
import { useLocations } from "@/hooks/use-locations";
import { useBrands }    from "@/hooks/use-brands";
import { Skeleton }     from "@/components/ui/skeleton";
import { EmptyState }   from "@/components/ui/empty-state";
import { cn }           from "@/lib/utils";
import { format }       from "date-fns";

const MOVEMENT_COLORS: Record<StockMovementType, string> = {
  PURCHASE_RECEIPT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ADJUSTMENT_IN:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ADJUSTMENT_OUT:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  OPENING_STOCK:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  RECONCILIATION:   "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SALE:             "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TRANSFER_IN:      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  TRANSFER_OUT:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
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

const OUT_TYPES: StockMovementType[] = ["SALE", "ADJUSTMENT_OUT", "TRANSFER_OUT"];

type Preset = "all" | "restocks" | "dispatches";

// ─── By-product summary table ─────────────────────────────────────────────────

function ProductSummaryTable({
  rows,
  isLoading,
  preset,
}: {
  rows: ProductMovementSummary[];
  isLoading: boolean;
  preset: Preset;
}) {
  const isRestocks   = preset === "restocks";
  const isDispatches = preset === "dispatches";
  const colSpan = isRestocks ? 6 : 7;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            {isRestocks ? (
              <>
                <TableHead className="text-right text-emerald-700 dark:text-emerald-400">Units Restocked</TableHead>
                <TableHead className="text-right text-muted-foreground">Restock Events</TableHead>
                <TableHead className="text-right text-muted-foreground">Avg per Restock</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead>Last Restock</TableHead>
              </>
            ) : isDispatches ? (
              <>
                <TableHead className="text-right text-red-700 dark:text-red-400">Units Dispatched</TableHead>
                <TableHead className="text-right text-muted-foreground">Dispatch Events</TableHead>
                <TableHead className="text-right text-muted-foreground">Avg per Dispatch</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead>Last Dispatch</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-right text-emerald-700 dark:text-emerald-400">Total In</TableHead>
                <TableHead className="text-right text-red-700 dark:text-red-400">Total Out</TableHead>
                <TableHead className="text-right">Net Change</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right text-muted-foreground">Movements</TableHead>
                <TableHead>Last Movement</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: colSpan }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="h-48">
                <EmptyState
                  icon={isRestocks ? PackagePlus : ArrowLeftRight}
                  title={isRestocks ? "No restocks found" : "No movements found"}
                  description="Adjust your filters to see results."
                />
              </TableCell>
            </TableRow>
          ) : isRestocks ? (
            rows.map((r) => (
              <TableRow key={r.productId}>
                <TableCell>
                  <div className="font-medium text-sm">{r.productName}</div>
                  {r.brandName && <div className="text-xs text-muted-foreground">{r.brandName}</div>}
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {r.totalIn > 0 ? `+${r.totalIn}` : "—"}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {r.movementCount}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {r.movementCount > 0 ? (r.totalIn / r.movementCount).toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">
                  {r.currentStock}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(r.lastMovement), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          ) : isDispatches ? (
            rows.map((r) => (
              <TableRow key={r.productId}>
                <TableCell>
                  <div className="font-medium text-sm">{r.productName}</div>
                  {r.brandName && <div className="text-xs text-muted-foreground">{r.brandName}</div>}
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-red-600 dark:text-red-400">
                  {r.totalOut > 0 ? `−${r.totalOut}` : "—"}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {r.movementCount}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {r.movementCount > 0 ? (r.totalOut / r.movementCount).toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">
                  {r.currentStock}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(r.lastMovement), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          ) : (
            rows.map((r) => (
              <TableRow key={r.productId}>
                <TableCell>
                  <div className="font-medium text-sm">{r.productName}</div>
                  {r.brandName && (
                    <div className="text-xs text-muted-foreground">{r.brandName}</div>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {r.totalIn > 0 ? `+${r.totalIn}` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono font-medium text-red-600 dark:text-red-400">
                  {r.totalOut > 0 ? `−${r.totalOut}` : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono font-medium",
                    r.netChange > 0  ? "text-emerald-600 dark:text-emerald-400" :
                    r.netChange < 0  ? "text-red-600 dark:text-red-400" :
                    "text-muted-foreground"
                  )}
                >
                  {r.netChange > 0 ? "+" : ""}{r.netChange}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">
                  {r.currentStock}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {r.movementCount}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(r.lastMovement), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PRESET_TYPE: Record<Preset, "all" | StockMovementType> = {
  all:        "all",
  restocks:   "ADJUSTMENT_IN",
  dispatches: "ADJUSTMENT_OUT",
};

const PRESET_TYPE_GROUP: Record<Preset, "in" | "out" | undefined> = {
  all:        undefined,
  restocks:   "in",
  dispatches: "out",
};

export function MovementsTable({ locationId: defaultLocationId }: { locationId?: string }) {
  const [locationId, setLocationId] = useState(defaultLocationId ?? "all");
  const [brandId,    setBrandId]    = useState("all");
  const [type,       setType]       = useState<"all" | StockMovementType>("all");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [page,       setPage]       = useState(1);
  const [view,       setView]       = useState<"movements" | "by-product">("movements");
  const [preset,     setPreset]     = useState<Preset>("all");
  const limit = 30;

  function applyPreset(p: Preset) {
    setPreset(p);
    setType(PRESET_TYPE[p]);
    setPage(1);
  }

  const sharedFilters = {
    locationId: locationId === "all" ? undefined : locationId,
    brandId:    brandId    === "all" ? undefined : brandId,
    dateFrom:   dateFrom   || undefined,
    dateTo:     dateTo     || undefined,
  };

  const { data, isLoading } = useStockMovements({
    ...sharedFilters,
    type: type === "all" ? undefined : type,
    page,
    limit,
  });

  const { data: summaryData, isLoading: summaryLoading } = useStockMovementsSummary({
    ...sharedFilters,
    typeGroup: PRESET_TYPE_GROUP[preset],
  });

  const { data: locations } = useLocations({ active: true });
  const { data: brands }    = useBrands();

  const rows       = data?.data    ?? [];
  const summary    = data?.summary;
  const totalPages = data ? Math.ceil(data.total / limit) : 1;
  const showSummary = !!(dateFrom || dateTo) && summary;

  return (
    <div className="space-y-4">
      {/* Preset chips */}
      <div className="flex items-center gap-2">
        {(["all", "restocks", "dispatches"] as Preset[]).map((p) => (
          <Button
            key={p}
            variant={preset === p ? "default" : "outline"}
            size="sm"
            className="h-7 px-3 text-xs capitalize"
            onClick={() => applyPreset(p)}
          >
            {p === "restocks" && <PackagePlus className="size-3.5 mr-1.5" />}
            {p === "dispatches" && <TrendingDown className="size-3.5 mr-1.5" />}
            {p === "all" ? "All Movements" : p.charAt(0).toUpperCase() + p.slice(1)}
          </Button>
        ))}
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={locationId} onValueChange={(v) => { setLocationId(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations?.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={brandId} onValueChange={(v) => { setBrandId(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands?.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type filter only applies to individual movements view */}
        {view === "movements" && (
          <Select value={type} onValueChange={(v) => { setType(v as typeof type); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(MOVEMENT_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="w-36"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="w-36"
          placeholder="To"
        />

        {/* View toggle */}
        <div className="ml-auto flex items-center rounded-md border p-0.5 gap-0.5">
          <Button
            variant={view === "movements" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setView("movements")}
          >
            <List className="size-3.5 mr-1.5" />
            Movements
          </Button>
          <Button
            variant={view === "by-product" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setView("by-product")}
          >
            <LayoutList className="size-3.5 mr-1.5" />
            By Product
          </Button>
        </div>
      </div>

      {/* Period summary cards — only when a date range is active */}
      {showSummary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 p-4 flex items-center gap-3">
            <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Received in period</p>
              <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
                +{summary.totalIn}
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-3">
            <TrendingDown className="size-5 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Dispatched in period</p>
              <p className="text-2xl font-semibold text-red-700 dark:text-red-400">
                −{summary.totalOut}
              </p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/40 p-4 flex items-center gap-3">
            <ArrowLeftRight className="size-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Net change</p>
              <p className={cn(
                "text-2xl font-semibold",
                summary.totalIn - summary.totalOut >= 0
                  ? "text-foreground"
                  : "text-red-700 dark:text-red-400"
              )}>
                {summary.totalIn - summary.totalOut >= 0 ? "+" : ""}
                {summary.totalIn - summary.totalOut}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* By-product summary */}
      {view === "by-product" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={!summaryData?.data?.length}
              onClick={() => {
                const p = new URLSearchParams();
                if (sharedFilters.locationId) p.set("locationId", sharedFilters.locationId);
                if (sharedFilters.brandId)    p.set("brandId",    sharedFilters.brandId);
                if (sharedFilters.dateFrom)   p.set("dateFrom",   sharedFilters.dateFrom);
                if (sharedFilters.dateTo)     p.set("dateTo",     sharedFilters.dateTo);
                window.open(`/api/stock/movements/summary/export?${p}`, "_blank");
              }}
            >
              <Download className="size-3.5 mr-1.5" />
              Export Excel
            </Button>
          </div>
          <ProductSummaryTable
            rows={summaryData?.data ?? []}
            isLoading={summaryLoading}
            preset={preset}
          />
        </div>
      )}

      {/* Individual movements table */}
      {view === "movements" && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Stock on Hand After</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
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
                    const isOut = OUT_TYPES.includes(m.type);
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
                            isOut
                              ? "text-destructive"
                              : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {isOut ? "−" : "+"}{m.quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-medium">
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
        </>
      )}
    </div>
  );
}
