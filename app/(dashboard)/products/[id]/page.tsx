"use client";

import { useState } from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useProduct } from "@/hooks/use-products";
import { ProductForm } from "@/components/products/product-form";
import { formatNumber, cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  PROFESSIONAL: "Professional",
  RETAIL: "Retail",
  BOTH: "Professional & Retail",
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading } = useProduct(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Product not found.{" "}
        <Link href="/products" className="underline">Back to products</Link>
      </div>
    );
  }

  const totalStock = product.inventory?.reduce((sum: number, i: any) => sum + i.quantity, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[product.sku, product.barcode].filter(Boolean).join(" · ") || "No SKU/barcode"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={product.isActive ? "outline" : "secondary"}>
            {product.isActive ? "Active" : "Archived"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1">
            <Pencil className="size-3.5" /> Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Details card */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Brand"    value={product.brand?.name} />
            <Separator />
            <Row label="Category" value={product.category?.name} />
            <Separator />
            <Row label="Type"     value={TYPE_LABEL[product.productType] ?? product.productType} />
            <Separator />
            <Row label="Unit"     value={product.unit} />
            {product.description && (
              <>
                <Separator />
                <div>
                  <p className="text-muted-foreground mb-1">Description</p>
                  <p>{product.description}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stock by location */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Stock by Location</span>
              <span className={cn(
                "text-lg font-bold",
                totalStock === 0 ? "text-destructive" : totalStock < 10 ? "text-amber-600" : "text-emerald-600"
              )}>
                {formatNumber(totalStock)} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {product.inventory?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Qty on Hand</TableHead>
                    <TableHead className="text-right">Min Qty</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead className="text-right">Reorder Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.inventory.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.location.name}</TableCell>
                      <TableCell className={cn(
                        "text-right font-mono",
                        inv.quantity <= 0 ? "text-destructive font-semibold" :
                        inv.quantity <= inv.minQuantity ? "text-amber-600" : ""
                      )}>
                        {formatNumber(inv.quantity)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatNumber(inv.minQuantity)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatNumber(inv.reorderPoint)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatNumber(inv.reorderQty)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                <Package className="size-8 opacity-30" />
                No stock records yet. Add locations in the Stock section.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Suppliers */}
      {product.productSuppliers?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Suppliers</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Supplier SKU</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Preferred</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.productSuppliers.map((ps: any) => (
                  <TableRow key={ps.id}>
                    <TableCell className="font-medium">{ps.supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground">{ps.supplierSku ?? "—"}</TableCell>
                    <TableCell className="text-right">{ps.cost ? `$${ps.cost.toFixed(2)}` : "—"}</TableCell>
                    <TableCell>{ps.isPreferred ? <Badge variant="outline">Preferred</Badge> : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ProductForm open={editOpen} onClose={() => setEditOpen(false)} product={product} />
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
