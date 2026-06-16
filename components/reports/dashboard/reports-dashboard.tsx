"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockValuationReport } from "./stock-valuation-report";
import { LowStockReport }       from "./low-stock-report";
import { MovementsReport }      from "./movements-report";
import { PoReport }             from "./po-report";

export function ReportsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Filter, review, and export inventory data
        </p>
      </div>

      <Tabs defaultValue="valuation">
        <TabsList>
          <TabsTrigger value="valuation">Stock Valuation</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="valuation"      className="mt-4"><StockValuationReport /></TabsContent>
        <TabsContent value="low-stock"      className="mt-4"><LowStockReport /></TabsContent>
        <TabsContent value="movements"      className="mt-4"><MovementsReport /></TabsContent>
        <TabsContent value="purchase-orders" className="mt-4"><PoReport /></TabsContent>
      </Tabs>
    </div>
  );
}
