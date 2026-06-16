"use client";

import { useState } from "react";
import { Package, AlertTriangle, PackageX, Warehouse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StockTable } from "./stock-table";
import { MovementsTable } from "@/components/stock/movements/dashboard/movements-table";
import { useStock } from "@/hooks/use-stock";
import { useLocations } from "@/hooks/use-locations";
import { AdjustStockForm } from "./adjust-stock-form";
import Link from "next/link";
import { Plus } from "lucide-react";

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function StockDashboard() {
  const [adjustOpen, setAdjustOpen] = useState(false);

  const { data: allStock } = useStock({ limit: 1000 });
  const { data: lowStock } = useStock({ status: "low", limit: 1 });
  const { data: outOfStock } = useStock({ status: "out", limit: 1 });
  const { data: locations } = useLocations({ active: true });

  const totalProducts = allStock?.total ?? 0;
  const lowCount = lowStock?.total ?? 0;
  const outCount = outOfStock?.total ?? 0;
  const locationCount = locations?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock & Locations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor stock levels across all locations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/stock/locations">
              <Warehouse className="mr-2 size-4" />
              Locations
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          description="with stock records"
        />
        <KpiCard
          title="Low Stock"
          value={lowCount}
          icon={AlertTriangle}
          description="at or below reorder point"
        />
        <KpiCard
          title="Out of Stock"
          value={outCount}
          icon={PackageX}
          description="zero or negative quantity"
        />
        <KpiCard
          title="Locations"
          value={locationCount}
          icon={Warehouse}
          description="active locations"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Stock Overview</TabsTrigger>
          <TabsTrigger value="movements">Movements Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <StockTable />
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <MovementsTable />
        </TabsContent>
      </Tabs>

      <AdjustStockForm
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        row={null}
      />
    </div>
  );
}
