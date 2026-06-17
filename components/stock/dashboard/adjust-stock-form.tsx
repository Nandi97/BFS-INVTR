"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAdjustStock, type StockMovementType, type InventoryRow } from "@/hooks/use-stock";

const schema = z.object({
  type: z.enum([
    "PURCHASE_RECEIPT",
    "ADJUSTMENT_IN",
    "ADJUSTMENT_OUT",
    "OPENING_STOCK",
    "RECONCILIATION",
    "SALE",
    "TRANSFER_IN",
    "TRANSFER_OUT",
  ]),
  quantity: z.number({ error: "Must be a positive number" }).positive(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  PURCHASE_RECEIPT: "Purchase Receipt (Add)",
  ADJUSTMENT_IN: "Adjustment — Add Stock",
  ADJUSTMENT_OUT: "Adjustment — Remove Stock",
  OPENING_STOCK: "Opening / Set Stock",
  RECONCILIATION: "Reconciliation",
  SALE: "Sale (Remove)",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
};

interface AdjustStockFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: InventoryRow | null;
}

export function AdjustStockForm({ open, onOpenChange, row }: AdjustStockFormProps) {
  const adjust = useAdjustStock();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "ADJUSTMENT_IN", quantity: 1, reference: "", notes: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!row) return;
    try {
      await adjust.mutateAsync({
        productId: row.productId,
        locationId: row.locationId,
        type: values.type as StockMovementType,
        quantity: values.quantity,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
      });
      toast.success("Stock adjusted successfully");
      form.reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to adjust stock");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>Adjust Stock</SheetTitle>
          <SheetDescription>
            {row
              ? `${row.product.name} · ${row.location.name} · Current: ${row.quantity} ${row.product.unit}`
              : "Adjust stock level"}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-6 space-y-5">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Movement Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(MOVEMENT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="PO number, invoice, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any notes about this adjustment" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-5 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adjust.isPending}>
                {adjust.isPending ? "Saving…" : "Save Adjustment"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
