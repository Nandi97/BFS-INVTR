"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useReceivePO, type PurchaseOrder } from "@/hooks/use-purchase-orders";

interface ReceivePOSheetProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  po:           PurchaseOrder | null;
}

export function ReceivePOSheet({ open, onOpenChange, po }: ReceivePOSheetProps) {
  const receivePO = useReceivePO();
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  const items = po?.items ?? [];

  function setQty(itemId: string, val: number) {
    setReceivedQtys((prev) => ({ ...prev, [itemId]: val }));
  }

  function fillAll() {
    const filled: Record<string, number> = {};
    for (const item of items) {
      const remaining = item.quantity - item.receivedQty;
      if (remaining > 0) filled[item.id] = remaining;
    }
    setReceivedQtys(filled);
  }

  async function handleSubmit() {
    if (!po) return;
    const receiveItems = Object.entries(receivedQtys)
      .filter(([, qty]) => qty > 0)
      .map(([itemId, receivedQty]) => ({ itemId, receivedQty }));

    if (receiveItems.length === 0) {
      toast.warning("Enter at least one received quantity");
      return;
    }

    try {
      const updated = await receivePO.mutateAsync({ id: po.id, items: receiveItems, notes: notes || undefined });
      toast.success(`${po.poNumber} updated — status: ${updated.status.replace(/_/g, " ")}`);
      setReceivedQtys({});
      setNotes("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to record receipt");
    }
  }

  if (!po) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Receive Items — {po.poNumber}</SheetTitle>
          <SheetDescription>
            {po.supplier.name} → {po.location.name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Enter quantities received for each line item.</p>
            <Button type="button" variant="outline" size="sm" onClick={fillAll}>
              Fill All Remaining
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Prev. Rcvd</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right w-28">Receive Now</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const remaining = item.quantity - item.receivedQty;
                  const done = remaining <= 0;
                  return (
                    <TableRow key={item.id} className={cn(done && "opacity-50")}>
                      <TableCell>
                        <div className="font-medium text-sm">{item.product.name}</div>
                        {item.product.brand && (
                          <div className="text-xs text-muted-foreground">{item.product.brand.name}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {item.receivedQty > 0 ? item.receivedQty : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {done ? (
                          <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">Done</Badge>
                        ) : (
                          remaining
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={remaining}
                          disabled={done}
                          placeholder="0"
                          className="h-7 w-24 text-sm text-right"
                          value={receivedQtys[item.id] ?? ""}
                          onChange={(e) =>
                            setQty(item.id, Math.min(remaining, Math.max(0, Number(e.target.value))))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes <span className="text-muted-foreground">(optional)</span></label>
            <Textarea
              placeholder="Any notes about this delivery…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={receivePO.isPending}>
              {receivePO.isPending ? "Saving…" : "Record Receipt"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
