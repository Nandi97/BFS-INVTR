"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductFiltersBar } from "@/components/products/product-filters";
import { ProductsTable } from "@/components/products/products-table";
import { ProductForm } from "@/components/products/product-form";
import { useProducts, type ProductFilters } from "@/hooks/use-products";

const DEFAULT_FILTERS: ProductFilters = { page: 1, limit: 50, isActive: true };

export default function ProductsPage() {
  const [filters, setFilters]   = useState<ProductFilters>(DEFAULT_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState<Record<string, any> | null>(null);

  const { data, isLoading } = useProducts(filters);
  const products = data?.products ?? [];
  const total    = data?.total    ?? 0;

  function updateFilters(partial: Partial<ProductFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  function openAdd()  { setEditing(null); setFormOpen(true); }
  function openEdit(p: Record<string, any>) { setEditing(p); setFormOpen(true); }
  function closeForm() { setFormOpen(false); setEditing(null); }

  const page       = filters.page  ?? 1;
  const limit      = filters.limit ?? 50;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} product${total !== 1 ? "s" : ""}` : "No products yet"}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="size-4" /> Add Product
        </Button>
      </div>

      <ProductFiltersBar
        filters={filters}
        onChange={updateFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      <Card className="overflow-hidden p-0">
        <ProductsTable products={products} isLoading={isLoading} onEdit={openEdit} />
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => updateFilters({ page: page - 1 })}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => updateFilters({ page: page + 1 })}>Next</Button>
          </div>
        </div>
      )}

      <ProductForm open={formOpen} onClose={closeForm} product={editing} />
    </div>
  );
}
