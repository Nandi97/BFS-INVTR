"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLocations } from "@/hooks/use-locations";
import { useQbSyncStock, type SyncResult } from "@/hooks/use-integrations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Parse a QB Physical Inventory Worksheet CSV (with or without header row).
 *  Expected columns (order flexible): Item Name, Qty On Hand, Reorder Point
 */
function parseQbStockCsv(raw: string) {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const normalise = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  const KNOWN_HEADERS: Record<string, string> = {
    itemname: "itemName",
    name:     "itemName",
    item:     "itemName",
    qtyonhand:"qty",
    qty:      "qty",
    quantity: "qty",
    reorderpoint: "reorderPoint",
    reorder:      "reorderPoint",
    sku:          "sku",
    barcode:      "sku",
  };

  // Detect whether first line is a header
  const firstCells = lines[0].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
  const isHeader = firstCells.some((c) => KNOWN_HEADERS[normalise(c)]);

  let colMap: Record<number, string> = {};
  let dataLines: string[];

  if (isHeader) {
    firstCells.forEach((c, i) => {
      const key = KNOWN_HEADERS[normalise(c)];
      if (key) colMap[i] = key;
    });
    dataLines = lines.slice(1);
  } else {
    // Assume order: Item Name, Qty, Reorder Point
    colMap = { 0: "itemName", 1: "qty", 2: "reorderPoint" };
    dataLines = lines;
  }

  return dataLines
    .map((line) => {
      const cells = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      const row: Record<string, string> = {};
      Object.entries(colMap).forEach(([idx, key]) => {
        row[key] = cells[parseInt(idx)] ?? "";
      });
      return row;
    })
    .filter((r) => r.itemName);
}

export function QbStockImport() {
  const [csv, setCsv]           = useState("");
  const [location, setLocation] = useState("BF Warehouse");
  const { data: locationList = [] } = useLocations({ active: true });
  const { mutate, isPending }   = useQbSyncStock();

  const [result, setResult] = useState<{
    synced: number; skipped: number; errors: string[]; total: number;
  } | null>(null);

  function handleSync() {
    const rows = parseQbStockCsv(csv);
    if (!rows.length) { toast.error("No valid rows found — check your CSV"); return; }
    mutate(
      { rows, location },
      {
        onSuccess: (data: SyncResult) => {
          const synced = data.synced ?? data.upserted ?? 0;
          setResult({ synced, skipped: data.skipped, errors: data.errors, total: data.total });
          toast.success(`Synced ${synced} of ${data.total} rows`);
        },
        onError: () => toast.error("Sync failed"),
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locationList.length > 0
                ? locationList.map((l) => (
                    <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                  ))
                : <SelectItem value="BF Warehouse">BF Warehouse</SelectItem>
              }
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Stock quantities will be applied to this location.</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qb-stock-csv">Paste QB Physical Inventory Worksheet CSV</Label>
        <p className="text-xs text-muted-foreground">
          Export from QB: Reports → Physical Inventory Worksheet → Export to Excel/CSV.
          Columns: <strong>Item Name</strong>, <strong>Qty On Hand</strong>, <strong>Reorder Point</strong> (optional).
        </p>
        <Textarea
          id="qb-stock-csv"
          className="font-mono text-xs min-h-[200px]"
          placeholder={"Item Name,Qty On Hand,Reorder Point\nTROIAREUKE RX 35ml,12,5\nBanhada Cleanser,8,3"}
          value={csv}
          onChange={(e) => { setCsv(e.target.value); setResult(null); }}
        />
      </div>

      <Button onClick={handleSync} disabled={isPending || !csv.trim()}>
        {isPending ? "Syncing…" : "Sync stock"}
      </Button>

      {result && (
        <div className={cn(
          "rounded-md border p-4 space-y-2 text-sm",
          result.errors.length > 0 && result.synced === 0 ? "border-destructive/40 bg-destructive/5"
          : result.errors.length > 0 ? "border-yellow-500/40 bg-yellow-500/5"
          : "border-green-500/40 bg-green-500/5"
        )}>
          <p>
            <span className="font-medium">{result.synced}</span> synced,{" "}
            <span className="font-medium">{result.skipped}</span> skipped
            {" "}of <span className="font-medium">{result.total}</span> rows
          </p>
          {result.errors.length > 0 && (
            <ul className="space-y-0.5 text-xs text-muted-foreground list-disc list-inside">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
