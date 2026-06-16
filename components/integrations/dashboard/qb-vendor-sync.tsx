"use client";

import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQbConfig, useQbVendorSync } from "@/hooks/use-integrations";

export function QbVendorSync() {
  const { data: config } = useQbConfig();
  const sync = useQbVendorSync();

  if (!config?.connected) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={sync.isPending}
      onClick={() =>
        sync.mutate(undefined, {
          onSuccess: (r) => {
            const msg = `Vendors synced: ${r.created} added, ${r.updated} updated, ${r.skipped} unchanged`;
            toast.success(msg);
          },
          onError: (e) => toast.error(`Vendor sync failed: ${e.message}`),
        })
      }
    >
      <RefreshCw className={`size-3.5 mr-1.5 ${sync.isPending ? "animate-spin" : ""}`} />
      {sync.isPending ? "Syncing…" : "Sync vendors from QuickBooks"}
    </Button>
  );
}
