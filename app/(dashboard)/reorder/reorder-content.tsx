"use client";

import { useState } from "react";
import { RefreshCcw, PackageX, AlertTriangle, TrendingDown, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ReorderTable } from "@/components/reorder/reorder-table";
import { useReorder, useCalculateMinimums } from "@/hooks/use-reorder";
import { toast } from "sonner";

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
  variant?: "default" | "destructive" | "warning";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon
          className={
            variant === "destructive"
              ? "size-4 text-destructive"
              : variant === "warning"
              ? "size-4 text-amber-500"
              : "size-4 text-muted-foreground"
          }
        />
      </CardHeader>
      <CardContent>
        <div
          className={
            variant === "destructive"
              ? "text-2xl font-semibold tabular-nums text-destructive"
              : variant === "warning"
              ? "text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400"
              : "text-2xl font-semibold tabular-nums"
          }
        >
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ReorderPageContent() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data, isLoading } = useReorder({ urgency: "all", includeInactive });
  const { mutate: calcMinimums, isPending: isCalcPending } = useCalculateMinimums();

  const rows        = data?.data ?? [];
  const outCount    = rows.filter((r) => r.urgency === "out").length;
  const urgentCount = rows.filter((r) => r.urgency === "urgent").length;
  const lowCount    = rows.filter((r) => r.urgency === "low").length;
  const totalAttention = rows.length;

  const noThresholdsSet = !isLoading && rows.every((r) => r.reorderPoint === 0);

  function handleCalculate() {
    calcMinimums(undefined, {
      onSuccess: (result: { updated: number; skipped: number; total: number }) => {
        if (result.updated > 0) {
          toast.success(`Updated reorder points for ${result.updated} products`);
        } else {
          toast.info(`No products updated — import sales data first so consumption can be calculated`);
        }
      },
      onError: () => toast.error("Calculation failed"),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Reorder</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Direct-supply location toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="include-inactive"
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
            />
            <Label htmlFor="include-inactive" className="text-sm cursor-pointer">
              Include direct-supply locations
            </Label>
          </div>

          {/* Calculate minimums */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCalculate}
            disabled={isCalcPending}
            className="gap-1.5"
          >
            <Calculator className="size-4" />
            {isCalcPending ? "Calculating…" : "Calculate minimums"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Attention"
          value={totalAttention}
          icon={RefreshCcw}
          description="products need restocking"
        />
        <KpiCard
          title="Out of Stock"
          value={outCount}
          icon={PackageX}
          description="zero or negative quantity"
          variant="destructive"
        />
        <KpiCard
          title="Below Reorder Point"
          value={urgentCount}
          icon={AlertTriangle}
          description="order now to avoid stockout"
          variant="warning"
        />
        <KpiCard
          title="Running Low"
          value={lowCount}
          icon={TrendingDown}
          description="≤ 2 months of stock remaining"
        />
      </div>

      {/* Prompt to calculate when no thresholds are set */}
      {noThresholdsSet && totalAttention > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 text-sm flex items-start gap-3">
          <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">Reorder points not set</p>
            <p className="text-amber-700 dark:text-amber-300 mt-0.5">
              Click <strong>Calculate minimums</strong> to automatically set reorder points based on monthly sales consumption and each brand&apos;s lead time.
              Requires sales history — import from QuickBooks via the Integrations page first.
            </p>
          </div>
        </div>
      )}

      {/* No alerts */}
      {!isLoading && totalAttention === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <RefreshCcw className="mx-auto size-8 text-muted-foreground mb-3" />
          <p className="font-medium">No reorder alerts</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Either all stock levels are healthy, or reorder thresholds haven't been set yet.
            Use <strong>Calculate minimums</strong> to auto-set them from sales data.
          </p>
        </div>
      )}

      {(isLoading || totalAttention > 0) && (
        <ReorderTable includeInactive={includeInactive} />
      )}
    </div>
  );
}
