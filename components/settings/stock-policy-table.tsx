"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight, Save, Calculator, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PolicyProduct {
  id:                string;
  name:              string;
  sku:               string | null;
  targetStockMonths: number;
  avgMonthly:        number;
  reorderQty:        number;
  hasSalesData:      boolean;
}

interface PolicyBrand {
  brandId:      string | null;
  brandName:    string;
  leadTimeDays: number;
  products:     PolicyProduct[];
}

interface PolicyData {
  brands: PolicyBrand[];
  total:  number;
}

const QUICK_SET = [1, 2, 3, 6, 9, 12] as const;

function calcQty(avg: number, months: number) {
  return avg > 0 ? Math.ceil(avg * months) : 0;
}

export function StockPolicyTable() {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery<PolicyData>({
    queryKey: ["settings", "stock-policy"],
    queryFn:  () => api.get<PolicyData>("/settings/stock-policy").then((r) => r.data),
  });

  const [edits, setEdits]           = useState<Record<string, number>>({});
  const [openBrands, setOpenBrands] = useState<Set<string>>(new Set());
  const [search, setSearch]         = useState("");

  const dirtyCount = Object.keys(edits).length;

  const setProductMonths = useCallback((productId: string, months: number, original: number) => {
    setEdits((prev) => {
      if (months === original) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: months };
    });
  }, []);

  const setBrandMonths = useCallback((products: PolicyProduct[], months: number) => {
    setEdits((prev) => {
      const next = { ...prev };
      for (const p of products) {
        if (months === p.targetStockMonths) {
          delete next[p.id];
        } else {
          next[p.id] = months;
        }
      }
      return next;
    });
  }, []);

  const toggleBrand = useCallback((name: string) => {
    setOpenBrands((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const saveMutation = useMutation({
    mutationFn: (updates: { id: string; targetStockMonths: number }[]) =>
      api.patch<{ updated: number; errors: string[]; total: number }>(
        "/settings/stock-policy", { updates }
      ).then((r) => r.data),
    onSuccess: (result: { updated: number; errors: string[]; total: number }) => {
      toast.success(`Saved ${result.updated} product${result.updated !== 1 ? "s" : ""}`);
      if (result.errors.length > 0) toast.warning(`${result.errors.length} item(s) failed to save`);
      setEdits({});
      qc.invalidateQueries({ queryKey: ["settings", "stock-policy"] });
    },
    onError: () => toast.error("Save failed"),
  });

  const recalcMutation = useMutation({
    mutationFn: () =>
      api.post<{ updated: number; skipped: number; total: number }>(
        "/inventory/calculate-minimums", {}
      ).then((r) => r.data),
    onSuccess: (result: { updated: number; skipped: number; total: number }) => {
      toast.success(`Reorder points recalculated for ${result.updated} products`);
      qc.invalidateQueries({ queryKey: ["reorder"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: () => toast.error("Recalculation failed"),
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate(
      Object.entries(edits).map(([id, targetStockMonths]) => ({ id, targetStockMonths }))
    );
  }, [edits, saveMutation]);

  const filteredBrands = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.brands;
    return data.brands
      .map((b) => ({
        ...b,
        products: b.products.filter(
          (p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)
        ),
      }))
      .filter((b) => b.products.length > 0 || b.brandName.toLowerCase().includes(q));
  }, [data, search]);

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">Loading products…</div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center space-y-2">
        <AlertTriangle className="mx-auto size-5 text-destructive" />
        <p className="text-sm font-medium">Failed to load stock policy</p>
        <p className="text-xs text-muted-foreground">
          Restart the dev server to pick up the latest database schema, then refresh this page.
        </p>
      </div>
    );
  }

  const withSalesData = data.brands.flatMap((b) => b.products).filter((p) => p.hasSalesData).length;

  return (
    <div className="space-y-4">

      {/* Stats row */}
      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground border rounded-lg px-4 py-3 bg-muted/20">
        <span><strong className="text-foreground">{data.total}</strong> products</span>
        <span><strong className="text-foreground">{data.brands.length}</strong> brands</span>
        <span>
          <strong className="text-foreground">{withSalesData}</strong> with sales data
          {withSalesData < data.total && (
            <span className="ml-1 text-amber-600 dark:text-amber-400">
              · {data.total - withSalesData} have no history (reorder qty will show —)
            </span>
          )}
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Brand accordion */}
      <div className="rounded-md border divide-y overflow-hidden">
        {filteredBrands.map((brand) => {
          const isOpen        = openBrands.has(brand.brandName) || search.trim().length > 0;
          const brandDirty    = brand.products.filter((p) => edits[p.id] !== undefined).length;
          const hasNoSales    = brand.products.every((p) => !p.hasSalesData);

          return (
            <Collapsible key={brand.brandName} open={isOpen} onOpenChange={() => toggleBrand(brand.brandName)}>

              {/* Brand header row */}
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-muted/30 group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ChevronRight
                      className={cn(
                        "size-4 text-muted-foreground shrink-0 transition-transform duration-150",
                        isOpen && "rotate-90"
                      )}
                    />
                    <span className="font-medium text-sm truncate">{brand.brandName}</span>
                    <Badge variant="secondary" className="text-xs tabular-nums shrink-0">
                      {brand.products.length}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {brand.leadTimeDays}d lead
                    </span>
                    {brandDirty > 0 && (
                      <Badge className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 shrink-0">
                        {brandDirty} unsaved
                      </Badge>
                    )}
                    {hasNoSales && (
                      <span className="text-xs text-muted-foreground shrink-0">(no sales data)</span>
                    )}
                  </div>

                  {/* Quick-set all in brand — stop propagation so it doesn't toggle accordion */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs text-muted-foreground mr-1 hidden sm:block">Set all:</span>
                    {QUICK_SET.map((m) => (
                      <Button
                        key={m}
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setBrandMonths(brand.products, m)}
                      >
                        {m}mo
                      </Button>
                    ))}
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Product rows */}
              <CollapsibleContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10 hover:bg-muted/10">
                      <TableHead className="pl-12 text-xs font-medium">Product</TableHead>
                      <TableHead className="text-xs font-medium">SKU</TableHead>
                      <TableHead className="text-right text-xs font-medium">Avg / mo</TableHead>
                      <TableHead className="text-center text-xs font-medium">Target months</TableHead>
                      <TableHead className="text-right text-xs font-medium pr-6">Reorder qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brand.products.map((product) => {
                      const currentMonths = edits[product.id] ?? product.targetStockMonths;
                      const isDirty       = edits[product.id] !== undefined;
                      const previewQty    = calcQty(product.avgMonthly, currentMonths);

                      return (
                        <TableRow
                          key={product.id}
                          className={cn(
                            "group/row",
                            isDirty && "bg-amber-50/40 dark:bg-amber-950/15"
                          )}
                        >
                          <TableCell className="pl-12 text-sm py-2">
                            <span className={cn(!product.hasSalesData && "text-muted-foreground")}>
                              {product.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono py-2">
                            {product.sku ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm py-2">
                            {product.avgMonthly > 0 ? product.avgMonthly : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <Input
                                type="number"
                                min={1}
                                max={36}
                                value={currentMonths}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  if (!isNaN(v) && v >= 1 && v <= 36) {
                                    setProductMonths(product.id, v, product.targetStockMonths);
                                  }
                                }}
                                className="w-16 h-7 text-sm text-center tabular-nums"
                              />
                              {isDirty && (
                                <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-medium pr-6 py-2">
                            {previewQty > 0 ? (
                              <span className={cn(isDirty && "text-amber-600 dark:text-amber-400 font-semibold")}>
                                {previewQty}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {filteredBrands.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No products match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className={cn(
        "sticky bottom-4 flex items-center justify-between gap-3 rounded-lg border bg-background/95 backdrop-blur px-4 py-3 shadow-lg transition-all",
        dirtyCount > 0 ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-2"
      )}>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{dirtyCount}</strong> unsaved change{dirtyCount !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEdits({})}>
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="gap-1.5"
          >
            <Save className="size-3.5" />
            {saveMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {/* Recalculate button — always visible below table */}
      <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3">
        <div>
          <p className="text-sm font-medium">Apply to reorder points</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Recalculate reorder quantities across all inventory using the current target months and sales data.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => recalcMutation.mutate()}
          disabled={recalcMutation.isPending || dirtyCount > 0}
          className="gap-1.5 shrink-0"
        >
          <Calculator className="size-3.5" />
          {recalcMutation.isPending ? "Recalculating…" : "Recalculate"}
        </Button>
      </div>
    </div>
  );
}
