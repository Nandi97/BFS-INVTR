"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, PackageCheck, Send, XCircle } from "lucide-react";
import { POStatusBadge } from "@/components/purchase-orders/dashboard/po-status-badge";
import { ReceivePOSheet } from "./receive-po-sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePurchaseOrder, useUpdatePO, useDeletePO, type PurchaseOrder } from "@/hooks/use-purchase-orders";

interface PODetailSheetProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  poId:         string | null;
  onDeleted?:   () => void;
}

export function PODetailSheet({ open, onOpenChange, poId, onDeleted }: PODetailSheetProps) {
  const [receiveOpen, setReceiveOpen]   = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);

  const { data: po, isLoading } = usePurchaseOrder(poId ?? "");
  const update = useUpdatePO();
  const remove = useDeletePO();

  async function markSent() {
    if (!po) return;
    try {
      await update.mutateAsync({ id: po.id, status: "SENT" });
      toast.success(`${po.poNumber} marked as sent`);
    } catch { toast.error("Failed to update status"); }
  }

  async function handleCancel() {
    if (!po) return;
    try {
      await update.mutateAsync({ id: po.id, status: "CANCELLED" });
      toast.success(`${po.poNumber} cancelled`);
      setCancelDialog(false);
    } catch { toast.error("Failed to cancel"); }
  }

  async function handleDelete() {
    if (!po) return;
    try {
      await remove.mutateAsync(po.id);
      toast.success(`${po.poNumber} deleted`);
      onOpenChange(false);
      onDeleted?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(msg ?? "Failed to delete");
    }
  }

  const totalValue = po?.items?.reduce((sum, i) => sum + (i.unitCost ?? 0) * i.quantity, 0) ?? 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {isLoading || !po ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Loading…
            </div>
          ) : (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle>{po.poNumber}</SheetTitle>
                  <POStatusBadge status={po.status} />
                </div>
                <SheetDescription>
                  Created {format(new Date(po.createdAt), "MMM d, yyyy")}
                  {po.sentAt && ` · Sent ${format(new Date(po.sentAt), "MMM d, yyyy")}`}
                  {po.receivedAt && ` · Received ${format(new Date(po.receivedAt), "MMM d, yyyy")}`}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Supplier + Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Supplier</p>
                    <p className="font-medium">{po.supplier.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deliver To</p>
                    <p className="font-medium">{po.location.name}</p>
                    <Badge variant="secondary" className="text-xs">{po.location.code}</Badge>
                  </div>
                </div>

                {po.notes && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    {po.notes}
                  </div>
                )}

                <Separator />

                {/* Items */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    Line Items <span className="text-muted-foreground">({po.items?.length ?? 0})</span>
                  </p>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Ordered</TableHead>
                          <TableHead className="text-right">Received</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium text-sm">{item.product.name}</div>
                              {item.product.brand && (
                                <div className="text-xs text-muted-foreground">{item.product.brand.name}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {item.receivedQty > 0 ? (
                                <span className={item.receivedQty >= item.quantity ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                                  {item.receivedQty}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">
                              {item.unitCost != null ? `$${item.unitCost.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {item.unitCost != null
                                ? `$${(item.unitCost * item.quantity).toFixed(2)}`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalValue > 0 && (
                    <div className="flex justify-end mt-2">
                      <p className="text-sm font-medium">
                        Total: <span className="font-mono">${totalValue.toFixed(2)}</span>
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {po.status === "DRAFT" && (
                    <>
                      <Button size="sm" onClick={markSent} disabled={update.isPending}>
                        <Send className="mr-1.5 size-3.5" /> Mark Sent
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={remove.isPending}
                      >
                        Delete Draft
                      </Button>
                    </>
                  )}
                  {(po.status === "SENT" || po.status === "PARTIALLY_RECEIVED") && (
                    <Button size="sm" onClick={() => setReceiveOpen(true)}>
                      <PackageCheck className="mr-1.5 size-3.5" /> Receive Items
                    </Button>
                  )}
                  {po.status !== "CANCELLED" && po.status !== "RECEIVED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setCancelDialog(true)}
                    >
                      <XCircle className="mr-1.5 size-3.5" /> Cancel PO
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ReceivePOSheet
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        po={po ?? null}
      />

      <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {po?.poNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the order as cancelled. Stock movements already recorded will not be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancel}
            >
              Cancel PO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
