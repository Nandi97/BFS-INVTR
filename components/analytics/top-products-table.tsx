"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TopProduct } from "@/hooks/use-sales";

interface Props {
  products: TopProduct[];
}

export function TopProductsTable({ products }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No sales data for this period.
      </div>
    );
  }

  const maxQty = products[0]?.totalQty ?? 1;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">#</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Brand</TableHead>
          <TableHead className="text-right">Total Units</TableHead>
          <TableHead className="text-right">Avg / Mo</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="w-32">Share</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((p, i) => {
          const pct = maxQty > 0 ? Math.round((p.totalQty / maxQty) * 100) : 0;
          return (
            <TableRow key={p.productId}>
              <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
              <TableCell>
                <div className="font-medium leading-tight">{p.name}</div>
                {p.sku && (
                  <div className="text-xs text-muted-foreground">{p.sku}</div>
                )}
              </TableCell>
              <TableCell>
                {p.brand ? (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {p.brand}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{p.totalQty.toLocaleString()}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {p.avgMonthly}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {p.totalRevenue > 0
                  ? `$${p.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
