"use client";

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
