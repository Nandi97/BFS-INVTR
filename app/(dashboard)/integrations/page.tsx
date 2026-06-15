import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QbOAuthConnect } from "@/components/integrations/qb-oauth-connect";
import { QbXlsUpload }  from "@/components/integrations/qb-xls-upload";
import { QbStockImport } from "@/components/integrations/qb-stock-import";
import { QbSalesImport } from "@/components/integrations/qb-sales-import";
import { QbConfigForm }  from "@/components/integrations/qb-config-form";
import { SyncLogTable }  from "@/components/integrations/sync-log-table";
import { QbApiSync }     from "@/components/integrations/qb-api-sync";

export default function IntegrationsPage() {
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
