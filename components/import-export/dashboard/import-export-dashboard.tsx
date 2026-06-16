"use client";

import { useState } from "react";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button }      from "@/components/ui/button";
import { Separator }   from "@/components/ui/separator";
import { Download }    from "lucide-react";
import { ImportPanel, type ImportResult } from "./import-panel";
import { PRODUCT_TEMPLATE, SUPPLIER_TEMPLATE, STOCK_TEMPLATE } from "./import-templates";
import { useLocations } from "@/hooks/use-locations";

export function ImportExportDashboard() {
  const { data: locations = [] } = useLocations();
  const [exportingProducts, setExportingProducts] = useState(false);
  const [exportingStock,    setExportingStock]    = useState(false);

  async function importProducts(rows: Record<string, string>[]): Promise<ImportResult> {
    const { data } = await axios.post("/api/import/products", { rows });
    return data;
  }

  async function importSuppliers(rows: Record<string, string>[]): Promise<ImportResult> {
    const { data } = await axios.post("/api/import/suppliers", { rows });
    return data;
  }

  async function importStock(rows: Record<string, string>[]): Promise<ImportResult> {
    const parsed = rows.map((r) => ({
      ...r,
      quantity:     r.quantity     ? Number(r.quantity)     : undefined,
      reorderPoint: r.reorderPoint ? Number(r.reorderPoint) : undefined,
      reorderQty:   r.reorderQty   ? Number(r.reorderQty)   : undefined,
    }));
    const { data } = await axios.post("/api/import/stock", { rows: parsed });
    return data;
  }

  function triggerExport(url: string, setState: (v: boolean) => void) {
    setState(true);
    const a = document.createElement("a");
    a.href = url;
    a.click();
    setTimeout(() => setState(false), 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import / Export</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bulk import your product catalog, suppliers, and stock from CSV or Excel exports
        </p>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="stock">Opening Stock</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        {/* Products import */}
        <TabsContent value="products" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ImportPanel
                title="Import Products"
                description="Create or update products and brands. Existing products matched by barcode, SKU, or exact name will be updated — others will be created."
                template={PRODUCT_TEMPLATE}
                onImport={importProducts}
                resultLabels={{ created: "created", updated: "updated", skipped: "skipped" }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers import */}
        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ImportPanel
                title="Import Suppliers"
                description="Create or update supplier records. Matched by exact name — existing suppliers will have their details updated."
                template={SUPPLIER_TEMPLATE}
                onImport={importSuppliers}
                resultLabels={{ created: "created", updated: "updated", skipped: "skipped" }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock import */}
        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {locations.length > 0 && (
                  <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-400 mb-1">Available locations</p>
                    <div className="flex flex-wrap gap-2">
                      {(locations as { name: string; code: string }[]).map((l) => (
                        <code key={l.code} className="text-xs bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                          {l.name} <span className="text-amber-600">({l.code})</span>
                        </code>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">Use any name or code in the "location" column.</p>
                  </div>
                )}
                <ImportPanel
                  title="Import Opening Stock"
                  description="Set current stock quantities per product per location. Each row creates an OPENING_STOCK movement and upserts the inventory record. Negative QB quantities should be set to 0 here and reconciled separately."
                  template={STOCK_TEMPLATE}
                  onImport={importStock}
                  resultLabels={{ upserted: "stock records set", skipped: "skipped" }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export */}
        <TabsContent value="export" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Data</CardTitle>
              <CardDescription>Download snapshots of your current data as CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 max-w-sm">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Product Catalog</p>
                    <p className="text-xs text-muted-foreground">All active products with brand, barcode, supplier</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={exportingProducts}
                    onClick={() => triggerExport("/api/export/products", setExportingProducts)}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    CSV
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Stock Snapshot</p>
                    <p className="text-xs text-muted-foreground">Current qty on hand, reorder points, all locations</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={exportingStock}
                    onClick={() => triggerExport("/api/export/stock", setExportingStock)}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    CSV
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground pt-2">
                  For movement history and stock valuation reports, use the{" "}
                  <a href="/reports" className="text-primary hover:underline">Reports</a> page.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
