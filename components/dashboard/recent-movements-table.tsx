"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useStockMovements } from "@/hooks/use-stock";
import { format } from "date-fns";

const TYPE_LABEL: Record<string, string> = {
  PURCHASE_RECEIPT: "Received",
  ADJUSTMENT_IN:    "Adj +",
  ADJUSTMENT_OUT:   "Adj −",
  OPENING_STOCK:    "Opening",
  SALE:             "Sale",
  TRANSFER_IN:      "Transfer in",
  TRANSFER_OUT:     "Transfer out",
  RECONCILIATION:   "Reconcile",
};

export function RecentMovementsTable() {
  const { data, isLoading } = useStockMovements({ limit: 8 });
  const movements = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Movements</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : movements.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No stock movements yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-sm">{m.product?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {TYPE_LABEL[m.type] ?? m.type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.location?.name ?? "—"}</TableCell>
                  <TableCell className={cn(
                    "text-right font-mono text-sm tabular-nums",
                    ["SALE","ADJUSTMENT_OUT","TRANSFER_OUT"].includes(m.type) ? "text-destructive" : "text-foreground"
                  )}>
                    {["SALE","ADJUSTMENT_OUT","TRANSFER_OUT"].includes(m.type) ? `−${m.quantity}` : `+${m.quantity}`}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm whitespace-nowrap">
                    {format(new Date(m.createdAt), "MMM d")}
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
