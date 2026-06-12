import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QbStockImport } from "@/components/integrations/qb-stock-import";
import { QbSalesImport } from "@/components/integrations/qb-sales-import";
import { QbConfigForm }  from "@/components/integrations/qb-config-form";
import { SyncLogTable }  from "@/components/integrations/sync-log-table";

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

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>QB Physical Inventory Worksheet</CardTitle>
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

        <TabsContent value="sales" className="mt-4">
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

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>QuickBooks settings</CardTitle>
              <CardDescription>
                Configure your QuickBooks connection details and default sync options.
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
