"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQbConfig, useQbNameSync, type NameSyncChange } from "@/hooks/use-integrations";

function ChangesPreview({ changes }: { changes: NameSyncChange[] }) {
  const [open, setOpen] = useState(false);
  if (!changes.length) return null;
  return (
    <div className="mt-4 rounded-md border text-sm">
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-left font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{changes.length} product{changes.length !== 1 ? "s" : ""} renamed</span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="border-t divide-y max-h-64 overflow-y-auto">
          {changes.map((c, i) => (
            <div key={i} className="px-3 py-2 text-xs">
              <div className="text-muted-foreground line-through">{c.oldName}</div>
              <div className="font-medium">{c.newName}</div>
              <div className="text-muted-foreground mt-0.5 flex items-center gap-1">
                SKU: {c.qboSku}
                {c.skuSet && <Badge variant="secondary" className="text-[10px] h-4">SKU backfilled</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function QbNameSync() {
  const { data: config } = useQbConfig();
  const sync = useQbNameSync();
  const [lastResult, setLastResult] = useState<{ renamed: NameSyncChange[]; unmatched: number; noSku: number } | null>(null);

  if (!config?.connected) return null;

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        disabled={sync.isPending}
        onClick={() =>
          sync.mutate(undefined, {
            onSuccess: (r) => {
              setLastResult({ renamed: r.renamed, unmatched: r.unmatched.length, noSku: r.noSku });
              const msg = r.renamed.length
                ? `${r.renamed.length} products renamed from QB`
                : "All product names already match QB";
              toast.success(msg);
            },
            onError: (e) => toast.error(`Name sync failed: ${e.message}`),
          })
        }
      >
        <RefreshCw className={`size-3.5 mr-1.5 ${sync.isPending ? "animate-spin" : ""}`} />
        {sync.isPending ? "Syncing…" : "Sync product names"}
      </Button>

      {lastResult && (
        <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
          <p>{lastResult.unmatched} QB items had no matching BFS product (SKU not found)</p>
          <p>{lastResult.noSku} QB items have no SKU — skipped to avoid ambiguous matches</p>
        </div>
      )}

      {lastResult && <ChangesPreview changes={lastResult.renamed} />}
    </div>
  );
}
