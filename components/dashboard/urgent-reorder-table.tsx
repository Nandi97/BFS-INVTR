"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { useReorder } from "@/hooks/use-reorder";

export function UrgentReorderTable() {
  const { data, isLoading } = useReorder({ urgency: "urgent" });
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Urgent Reorders
          {!isLoading && total > 0 && (
            <Badge variant="destructive" className="text-xs">{total}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No urgent reorder alerts
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">In Stock</TableHead>
                <TableHead className="text-right">Avg/mo</TableHead>
                <TableHead className="text-right">Suggest Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 8).map((row) => (
                <TableRow key={row.inventoryId}>
                  <TableCell className="font-medium text-sm">{row.product.name}</TableCell>
                  <TableCell>
                    {row.product.brand && (
                      <Badge variant="outline" className="text-xs">{row.product.brand.name}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={row.urgency === "out" ? "text-destructive font-semibold" : "text-amber-600 dark:text-amber-400 font-semibold"}>
                      {formatNumber(row.quantity)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                    {row.avgMonthly > 0 ? row.avgMonthly.toFixed(1) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {row.suggestedOrderQty ? formatNumber(row.suggestedOrderQty) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
