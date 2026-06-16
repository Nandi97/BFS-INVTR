"use client";

import { useState, useCallback } from "react";
import { useBrands, useUpdateBrand, type Brand } from "@/hooks/use-brands";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LOCAL_THRESHOLD = 20; // ≤20 days = local

function LeadTypeBadge({ days }: { days: number }) {
  return days <= LOCAL_THRESHOLD ? (
    <Badge variant="outline" className="border-green-500/40 text-green-700 dark:text-green-400 text-xs">
      Local
    </Badge>
  ) : (
    <Badge variant="outline" className="border-blue-500/40 text-blue-700 dark:text-blue-400 text-xs">
      International
    </Badge>
  );
}

function EditableRow({ brand }: { brand: Brand }) {
  const [editing, setEditing]     = useState(false);
  const [leadDays, setLeadDays]   = useState(brand.leadTimeDays);
  const { mutate, isPending }     = useUpdateBrand();

  const save = useCallback(() => {
    if (leadDays === brand.leadTimeDays) { setEditing(false); return; }
    mutate(
      { id: brand.id, name: brand.name, leadTimeDays: leadDays },
      {
        onSuccess: () => { toast.success(`${brand.name} updated`); setEditing(false); },
      }
    );
  }, [brand, leadDays, mutate]);

  const cancel = useCallback(() => {
    setLeadDays(brand.leadTimeDays);
    setEditing(false);
  }, [brand.leadTimeDays]);

  return (
    <TableRow className={cn(editing && "bg-muted/30")}>
      <TableCell className="font-medium text-sm">{brand.name}</TableCell>
      <TableCell className="tabular-nums text-sm text-muted-foreground text-right">
        {brand._count.products}
      </TableCell>
      <TableCell>
        {editing ? (
          <Input
            type="number"
            min={1}
            max={365}
            value={leadDays}
            onChange={(e) => setLeadDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            autoFocus
            className="w-24 h-7 text-sm tabular-nums"
          />
        ) : (
          <span className="tabular-nums text-sm">{brand.leadTimeDays} days</span>
        )}
      </TableCell>
      <TableCell>
        <LeadTypeBadge days={editing ? leadDays : brand.leadTimeDays} />
      </TableCell>
      <TableCell className="text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={save}
              disabled={isPending}
            >
              <Check className="size-3.5 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" className="size-7" onClick={cancel}>
              <X className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function BrandLeadTimesTable() {
  const { data: brands, isLoading } = useBrands();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading brands…</p>;
  }

  const sorted = [...(brands ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const local  = sorted.filter((b) => b.leadTimeDays <= LOCAL_THRESHOLD).length;
  const intl   = sorted.length - local;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{sorted.length}</strong> brands</span>
        <span><strong className="text-green-600 dark:text-green-400">{local}</strong> local (≤{LOCAL_THRESHOLD}d)</span>
        <span><strong className="text-blue-600 dark:text-blue-400">{intl}</strong> international</span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((brand) => (
              <EditableRow key={brand.id} brand={brand} />
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Lead time affects the <strong>Reorder Point</strong> (how much stock you need on hand before placing an order).
        Click the pencil icon on any row to edit. Changes apply after recalculating reorder points on the Stock Policy tab.
      </p>
    </div>
  );
}
