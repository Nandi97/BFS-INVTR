"use client";

import { useState } from "react";
import { Plus, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { POForm } from "@/components/purchase-orders/po-form";
import { POTable } from "@/components/purchase-orders/po-table";
import { usePurchaseOrders } from "@/hooks/use-purchase-orders";

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
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
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function PurchaseOrdersPage() {
  const [formOpen, setFormOpen] = useState(false);

  const { data: all }               = usePurchaseOrders({ limit: 1 });
  const { data: drafts }            = usePurchaseOrders({ status: "DRAFT",               limit: 1 });
  const { data: sent }              = usePurchaseOrders({ status: "SENT",                limit: 1 });
  const { data: partial }           = usePurchaseOrders({ status: "PARTIALLY_RECEIVED",  limit: 1 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage supplier orders and track deliveries
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 size-4" />
          New PO
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Orders"
          value={all?.total ?? 0}
          icon={FileText}
          description="all time"
        />
        <KpiCard
          title="Drafts"
          value={drafts?.total ?? 0}
          icon={FileText}
          description="not yet sent"
        />
        <KpiCard
          title="Sent / Awaiting"
          value={sent?.total ?? 0}
          icon={Clock}
          description="pending delivery"
        />
        <KpiCard
          title="Partially Received"
          value={partial?.total ?? 0}
          icon={AlertCircle}
          description="delivery in progress"
        />
      </div>

      <POTable />

      <POForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
