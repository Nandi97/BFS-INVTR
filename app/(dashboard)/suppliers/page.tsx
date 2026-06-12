"use client";

import { useState } from "react";
import { Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { useSuppliers } from "@/hooks/use-suppliers";

export default function SuppliersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const { data } = useSuppliers({ limit: 1 });
  const hasSuppliers = (data?.total ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage vendors, contacts, and lead times
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add Supplier
        </Button>
      </div>

      {!hasSuppliers && data !== undefined ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
          <Truck className="size-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">No suppliers yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Add your suppliers to link them to products and generate purchase orders.
          </p>
          <Button className="mt-4" onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add First Supplier
          </Button>
        </div>
      ) : (
        <SuppliersTable />
      )}

      <SupplierForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
