"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Pencil, Archive, Eye } from "lucide-react";
import { useArchiveProduct } from "@/hooks/use-products";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, { label: string; className: string }> = {
  PROFESSIONAL: { label: "Pro",   className: "bg-blue-100 text-blue-700 border-blue-200" },
  RETAIL:       { label: "Retail", className: "bg-purple-100 text-purple-700 border-purple-200" },
  BOTH:         { label: "Both",  className: "bg-slate-100 text-slate-600 border-slate-200" },
};

interface Product {
  id:          string;
  name:        string;
  sku?:        string | null;
  barcode?:    string | null;
  productType: string;
  isActive:    boolean;
  totalStock:  number;
  brand?:      { name: string } | null;
  category?:   { name: string } | null;
}

interface ProductsTableProps {
  products:  Product[];
  isLoading: boolean;
  onEdit:    (product: Product) => void;
}

export function ProductsTable({ products, isLoading, onEdit }: ProductsTableProps) {
  const archive              = useArchiveProduct();
  const [toArchive, setToArchive] = useState<Product | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No products found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const typeMeta = TYPE_LABEL[p.productType] ?? TYPE_LABEL.BOTH;
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.sku, p.barcode].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.brand?.name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.category?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <span className={cn("rounded border px-1.5 py-0.5 text-xs font-medium", typeMeta.className)}>
                    {typeMeta.label}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <span className={p.totalStock === 0 ? "text-destructive font-semibold" : ""}>
                    {formatNumber(p.totalStock)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={p.isActive ? "outline" : "secondary"} className="text-xs">
                    {p.isActive ? "Active" : "Archived"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${p.id}`}>
                          <Eye className="size-4 mr-2" /> View detail
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(p)}>
                        <Pencil className="size-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      {p.isActive && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setToArchive(p)}
                          >
                            <Archive className="size-4 mr-2" /> Archive
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!toArchive} onOpenChange={(v) => !v && setToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive product?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toArchive?.name}</strong> will be hidden from active inventory but its history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (toArchive) archive.mutate(toArchive.id);
                setToArchive(null);
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
