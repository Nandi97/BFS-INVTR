"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge }   from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportFilters } from "@/components/reports/report-filters";
import { useStockValuationReport } from "@/hooks/use-reports";
import { useLocations }  from "@/hooks/use-locations";
import { useBrands }     from "@/hooks/use-brands";
import { exportCsv }     from "@/lib/csv-export";

const EMPTY = { locationId: "", brandId: "" };

export function StockValuationReport() {
  const [filters, setFilters] = useState(EMPTY);

  const { data, isLoading } = useStockValuationReport({
    locationId: filters.locationId || undefined,
    brandId:    filters.brandId    || undefined,
  });

  const { data: locations = [] } = useLocations();
  const { data: brands  }       = useBrands();

  const rows      = data?.data ?? [];
  const brandList = (brands as { id: string; name: string }[] | undefined) ?? [];

  function onExport() {
    exportCsv(
      `stock-valuation-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Product", "SKU", "Brand", "Category", "Location", "Qty", "Reorder Point", "Unit Cost", "Total Value", "Supplier"],
      rows.map((r) => [r.productName, r.sku, r.brand, r.category, r.location, r.quantity, r.reorderPoint, r.unitCost, r.totalValue, r.supplierName])
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stock Valuation</CardTitle>
        <CardDescription>Current inventory quantities and estimated values based on preferred supplier cost</CardDescription>
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

        {/* Summary strip */}
        {!isLoading && data && (
          <div className="flex gap-6 rounded-lg border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Total Units</p>
              <p className="text-lg font-semibold">{data.totalUnits.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Estimated Value</p>
              <p className="text-lg font-semibold">
                {data.totalValue > 0
                  ? `$${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SKUs</p>
              <p className="text-lg font-semibold">{rows.length}</p>
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
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Reorder Pt</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Supplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">No data</TableCell></TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow key={`${r.productId}-${r.locationId}-${i}`}>
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
                      <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{r.reorderPoint}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.unitCost > 0 ? `$${r.unitCost.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {r.totalValue > 0 ? `$${r.totalValue.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.supplierName ?? "—"}</TableCell>
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
