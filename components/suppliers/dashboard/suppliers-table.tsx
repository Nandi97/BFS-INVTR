"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Search, Clock, Mail, Phone, SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import {
  useSuppliers, useUpdateSupplier, useDeleteSupplier, type Supplier,
} from "@/hooks/use-suppliers";
import { SupplierForm } from "@/components/suppliers/create/supplier-form";
import { cn } from "@/lib/utils";

export function SuppliersTable() {
  const [search, setSearch] = useState("");
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data, isLoading } = useSuppliers({ search: search || undefined, page, limit });
  const update = useUpdateSupplier();
  const remove = useDeleteSupplier();

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  async function handleToggleActive(s: Supplier) {
    try {
      await update.mutateAsync({ id: s.id, isActive: !s.isActive });
      toast.success(`${s.name} ${s.isActive ? "deactivated" : "activated"}`);
    } catch {
      toast.error("Failed to update supplier");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(msg ?? "Failed to delete supplier");
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-8"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email / Phone</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Clock className="size-3.5" /> Lead Time
                </div>
              </TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead className="text-right">POs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48">
                  <EmptyState
                    icon={SearchX}
                    title="No suppliers match your search"
                    description={`No results for "${search}". Try a different name or contact.`}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id} className={cn(!s.isActive && "opacity-60")}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    {s.notes && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{s.notes}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.contactName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      {s.email && (
                        <a
                          href={`mailto:${s.email}`}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Mail className="size-3" />{s.email}
                        </a>
                      )}
                      {s.phone && (
                        <a
                          href={`tel:${s.phone}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                        >
                          <Phone className="size-3" />{s.phone}
                        </a>
                      )}
                      {!s.email && !s.phone && <span className="text-sm text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-sm">{s.leadTimeDays}d</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {s._count?.productSuppliers ?? 0}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {s._count?.purchaseOrders ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        s.isActive
                          ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                          : "border-muted-foreground text-muted-foreground"
                      )}
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditSupplier(s)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(s)}>
                          {s.isActive ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(s)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination + count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total} supplier{total !== 1 ? "s" : ""}
          {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
        </p>
        {totalPages > 1 && (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>

      <SupplierForm
        open={!!editSupplier}
        onOpenChange={(o) => !o && setEditSupplier(null)}
        supplier={editSupplier}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the supplier. Suppliers with purchase orders cannot be deleted — deactivate instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
