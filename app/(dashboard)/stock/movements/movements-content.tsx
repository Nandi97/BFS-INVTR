"use client";

import { MovementsTable } from "@/components/stock/movements-table";

export function MovementsPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Movements Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Full history of stock adjustments, receipts, and transfers
        </p>
      </div>
      <MovementsTable />
    </div>
  );
}
