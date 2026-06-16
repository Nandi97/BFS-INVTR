"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  useCreateSupplier, useUpdateSupplier, type Supplier,
} from "@/hooks/use-suppliers";

const schema = z.object({
  name:         z.string().min(1, "Required"),
  contactName:  z.string().optional(),
  email:        z.string().email("Invalid email").optional().or(z.literal("")),
  phone:        z.string().optional(),
  address:      z.string().optional(),
  leadTimeDays: z.number().min(0).max(365),
  notes:        z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SupplierFormProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  supplier?:     Supplier | null;
}

export function SupplierForm({ open, onOpenChange, supplier }: SupplierFormProps) {
  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const isEdit = !!supplier;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", contactName: "", email: "", phone: "",
      address: "", leadTimeDays: 7, notes: "",
    },
  });

  useEffect(() => {
    if (supplier) {
      form.reset({
        name:         supplier.name,
        contactName:  supplier.contactName  ?? "",
        email:        supplier.email        ?? "",
        phone:        supplier.phone        ?? "",
        address:      supplier.address      ?? "",
        leadTimeDays: supplier.leadTimeDays,
        notes:        supplier.notes        ?? "",
      });
    } else {
      form.reset({ name: "", contactName: "", email: "", phone: "", address: "", leadTimeDays: 7, notes: "" });
    }
  }, [supplier, form]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && supplier) {
        await update.mutateAsync({ id: supplier.id, ...values, email: values.email || null });
        toast.success("Supplier updated");
      } else {
        await create.mutateAsync({ ...values, email: values.email || undefined });
        toast.success("Supplier created");
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(msg ?? `Failed to ${isEdit ? "update" : "create"} supplier`);
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Supplier" : "Add Supplier"}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Editing ${supplier?.name}` : "Add a new supplier or vendor."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
            {/* Identity */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Nuskinn Canada" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Details</p>

            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="Full name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Input type="email" placeholder="orders@supplier.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Input type="tel" placeholder="+1 (555) 000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address <span className="text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="Street, City, Country" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order Settings</p>

            <FormField
              control={form.control}
              name="leadTimeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Time (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormDescription>How many days from order to delivery.</FormDescription>
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
                    <Textarea
                      placeholder="Minimum order amounts, payment terms, special instructions…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Add Supplier")}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
