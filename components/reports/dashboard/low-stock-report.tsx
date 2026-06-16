"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn }       from "@/lib/utils";
import { ReportFilters }  from "./report-filters";
import { useLowStockReport } from "@/hooks/use-reports";
import { useLocations }   from "@/hooks/use-locations";
import { useBrands }      from "@/hooks/use-brands";
import { exportCsv }      from "@/lib/csv-export";

const EMPTY = { locationId: "", brandId: "" };

export function LowStockReport() {
  const [filters, setFilters] = useState(EMPTY);

  const { data, isLoading } = useLowStockReport({
    locationId: filters.locationId || undefined,
    brandId:    filters.brandId    || undefined,
  });

  const { data: locations = [] } = useLocations();
  const { data: brands  }       = useBrands();

  const rows      = data?.data ?? [];
  const brandList = (brands as { id: string; name: string }[] | undefined) ?? [];

  function onExport() {
    exportCsv(
      `low-stock-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Product", "SKU", "Brand", "Location", "Qty on Hand", "Reorder Point", "Shortage", "Reorder Qty", "Status", "Supplier", "Lead Time (days)", "Supplier SKU", "Unit Cost"],
      rows.map((r) => [
        r.productName, r.sku, r.brand, r.location,
        r.quantity, r.reorderPoint, r.shortage, r.reorderQty,
        r.isOut ? "OUT OF STOCK" : "LOW STOCK",
        r.supplier, r.leadTimeDays, r.supplierSku,
        r.unitCost ?? "",
      ])
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Low Stock Report</CardTitle>
        <CardDescription>Items at or below their reorder point, with supplier details for quick reordering</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ReportFilters
          filters={[
            {
              key: "locationId", label: "Location", type: "select",
              options: (locations as { id: string; name: string }[]).map((l) => ({ value: l.id, label: l.name })),
            },
            {
              key: "brandId", label: "Brand", type: "select",
              options: brandList.map((b) => ({ value: b.id, label: b.name })),
            },
          ]}
          values={filters}
          onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
          onReset={() => setFilters(EMPTY)}
          onExport={onExport}
          total={rows.length}
        />

        {!isLoading && data && rows.length > 0 && (
          <div className="flex gap-6 rounded-lg border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Out of Stock</p>
              <p className="text-lg font-semibold text-destructive">{data.outOfStock}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Stock</p>
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{data.lowStock}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Items</p>
              <p className="text-lg font-semibold">{data.total}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (
          <div className="rounded-md border overflow-auto max-h-[520px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Reorder Pt</TableHead>
                  <TableHead className="text-right">Shortage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Lead Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                      All items are above their reorder points
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={`${r.productId}`} className={r.isOut ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <div className="font-medium leading-tight">{r.productName}</div>
                        {r.sku && <div className="text-xs text-muted-foreground">{r.sku}</div>}
                      </TableCell>
                      <TableCell>
                        {r.brand
                          ? <Badge variant="secondary" className="text-xs font-normal">{r.brand}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{r.location}</TableCell>
                      <TableCell className={cn("text-right tabular-nums font-medium", r.isOut ? "text-destructive" : "text-amber-600 dark:text-amber-400")}>
                        {r.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{r.reorderPoint}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.shortage > 0 ? r.shortage : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.isOut ? "destructive" : "outline"} className="text-xs">
                          {r.isOut ? "Out of stock" : "Low stock"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.supplier
                          ? (
                            <div>
                              <div>{r.supplier}</div>
                              {r.supplierEmail && (
                                <a href={`mailto:${r.supplierEmail}`} className="text-xs text-primary hover:underline">
                                  {r.supplierEmail}
                                </a>
                              )}
                            </div>
                          )
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {r.leadTimeDays != null ? `${r.leadTimeDays}d` : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
