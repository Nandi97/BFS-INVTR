"use client";

import { useState } from "react";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { QbOAuthConnect } from "./qb-oauth-connect";
import { QbXlsUpload }  from "./qb-xls-upload";
import { QbStockImport } from "./qb-stock-import";
import { QbSalesImport } from "./qb-sales-import";
import { QbConfigForm }  from "./qb-config-form";
import { SyncLogTable }  from "./sync-log-table";
import { QbApiSync }     from "./qb-api-sync";
import { QbVendorSync }  from "./qb-vendor-sync";
import { QbNameSync }    from "./qb-name-sync";
import { useQbBackfillMovements, type BackfillResult } from "@/hooks/use-integrations";
import { toast } from "sonner";
import { History } from "lucide-react";

function QbBackfillCard() {
  const backfill = useQbBackfillMovements();
  const [result, setResult] = useState<BackfillResult | null>(null);
  const done = result !== null;

  function run() {
    backfill.mutate(undefined, {
      onSuccess: (r) => {
        setResult(r);
        toast.success(
          `Backfill complete — ${r.movements.written} movements written, ${r.movements.skipped} already existed`
        );
      },
      onError: (e) => toast.error(`Backfill failed: ${e.message}`),
    });
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="size-4 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base">Backfill historical dispatch movements</CardTitle>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                One-time
              </span>
            </div>
            <CardDescription>
              Reads QB Invoices from the last 2 years and writes dispatch (out) movement records into
              the Movements Log. Read-only against QuickBooks — nothing is written to QB.
              Safe to re-run; duplicate records are automatically skipped.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-300 dark:border-amber-800"
            disabled={backfill.isPending || done}
            onClick={run}
          >
            <History className={`size-3.5 mr-1.5 ${backfill.isPending ? "animate-spin" : ""}`} />
            {backfill.isPending ? "Running…" : done ? "Done" : "Run backfill"}
          </Button>
        </div>
      </CardHeader>
      {result && (
        <CardContent className="pt-0">
          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
            <p><span className="font-medium">{result.invoicesProcessed}</span> invoices scanned · <span className="font-medium">{result.productsMatched}</span> products matched in QB</p>
            <p className="text-emerald-700 dark:text-emerald-400"><span className="font-medium">{result.movements.written}</span> movements written</p>
            {result.movements.skipped > 0 && (
              <p className="text-muted-foreground"><span className="font-medium">{result.movements.skipped}</span> already existed (skipped)</p>
            )}
            {result.movements.noMatch > 0 && (
              <p className="text-muted-foreground"><span className="font-medium">{result.movements.noMatch}</span> invoice lines had no matching BFS product</p>
            )}
            {result.errors.length > 0 && (
              <p className="text-destructive"><span className="font-medium">{result.errors.length}</span> errors — check sync history for details</p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function IntegrationsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sync stock and sales data from QuickBooks Online.
        </p>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock sync</TabsTrigger>
          <TabsTrigger value="sales">Sales sync</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="config">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sync from QuickBooks</CardTitle>
                  <CardDescription className="mt-1">
                    Pull live stock quantities directly from your QuickBooks account.
                  </CardDescription>
                </div>
                <Suspense fallback={null}>
                  <QbApiSync mode="stock" />
                </Suspense>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Sync product names</CardTitle>
                  <CardDescription className="mt-1">
                    Overwrites product names in BFS with the canonical names from QuickBooks, matched by SKU.
                    Runs automatically on the 1st of each month. Use the button to run on demand after QB catalogue changes.
                    Items without a QB SKU are skipped to avoid ambiguous matches.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={null}>
                <QbNameSync />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import from file</CardTitle>
              <CardDescription>
                Upload a <code>ProductServiceList__*.xls</code> export from QuickBooks to update stock quantities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QbXlsUpload />
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            or paste CSV manually
            <Separator className="flex-1" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Paste CSV</CardTitle>
              <CardDescription>
                Paste a CSV export from QuickBooks to update stock quantities.
                Negative quantities are clamped to 0 and a reconciliation movement is recorded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QbStockImport />
            </CardContent>
          </Card>

          <QbBackfillCard />
        </TabsContent>

        <TabsContent value="sales" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sync from QuickBooks</CardTitle>
                  <CardDescription className="mt-1">
                    Pull last 12 months of sales history directly from your QuickBooks account.
                  </CardDescription>
                </div>
                <Suspense fallback={null}>
                  <QbApiSync mode="sales" />
                </Suspense>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>QB Sales by Product/Service Summary</CardTitle>
              <CardDescription>
                Paste a CSV export from QuickBooks to import monthly sales history.
                Supports both the wide (Jan–Dec columns) and flat (one row per month) formats.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QbSalesImport />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sync vendors from QuickBooks</CardTitle>
                  <CardDescription className="mt-1">
                    Imports all active QB vendors into your Suppliers list. New vendors are created;
                    existing suppliers are updated only if contact fields (email, phone, address) are currently blank.
                    Manual edits are never overwritten.
                  </CardDescription>
                </div>
                <Suspense fallback={null}>
                  <QbVendorSync />
                </Suspense>
              </div>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QuickBooks Online connection</CardTitle>
              <CardDescription>
                Authorise this app to access your QuickBooks data via OAuth 2.0.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={null}>
                <QbOAuthConnect />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Default options used during sync operations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QbConfigForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync history</CardTitle>
              <CardDescription>All QuickBooks sync operations, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              <SyncLogTable provider="QUICKBOOKS" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
