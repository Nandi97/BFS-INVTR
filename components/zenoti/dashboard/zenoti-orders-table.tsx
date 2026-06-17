"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Package, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { useZenotiOrders, useSyncZenoti } from "@/hooks/use-zenoti";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; variant: "outline" | "secondary" | "default" | "destructive" }> = {
  PENDING:     { label: "Pending",     variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "default"   },
  SUBMITTED:   { label: "Submitted",   variant: "outline"   },
  INVOICED:    { label: "Invoiced",    variant: "outline"   },
};

const ZENOTI_STATUS_CONFIG: Record<string, { label: string; colour: string }> = {
  RAISED:  { label: "Raised",  colour: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
  UPDATED: { label: "Updated", colour: "text-blue-600 bg-blue-50 dark:bg-blue-950/40"   },
};

function FulfillmentIcon({ status }: { status?: string }) {
  if (!status || status === "PENDING")     return <Clock className="size-4 text-muted-foreground" />;
  if (status === "IN_PROGRESS")            return <Package className="size-4 text-primary" />;
  if (status === "SUBMITTED")              return <CheckCircle2 className="size-4 text-emerald-600" />;
  if (status === "INVOICED")               return <CheckCircle2 className="size-4 text-muted-foreground" />;
  return null;
}

export function ZenotiOrdersTable() {
  const router = useRouter();
  const { data: rawOrders, isLoading, isError } = useZenotiOrders();
  const orders: any[] = Array.isArray(rawOrders) ? rawOrders : [];
  const sync = useSyncZenoti();

  async function handleSync() {
    const result = await sync.mutateAsync();
    toast.success(`Sync complete — ${result.totalNew} new, ${result.totalUpdated} updated`);
  }

  const pending     = orders.filter((o) => !o.fulfillment || o.fulfillment.status === "PENDING");
  const inProgress  = orders.filter((o) => o.fulfillment?.status === "IN_PROGRESS");
  const submitted   = orders.filter((o) => ["SUBMITTED","INVOICED"].includes(o.fulfillment?.status));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting Packing" count={pending.length}    icon={<AlertCircle className="size-5 text-amber-500" />} />
        <StatCard label="In Progress"       count={inProgress.length} icon={<Package     className="size-5 text-primary"    />} />
        <StatCard label="Submitted"         count={submitted.length}  icon={<CheckCircle2 className="size-5 text-emerald-500" />} />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Zenoti Procurement Orders</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={sync.isPending}
            className="gap-1.5"
          >
            {sync.isPending
              ? <Loader2 className="size-4 animate-spin" />
              : <RefreshCw className="size-4" />
            }
            Sync from Zenoti
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <Loader2 className="size-4 animate-spin" /> Loading orders…
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-40 text-destructive text-sm gap-2">
              <AlertCircle className="size-4" /> Failed to load orders — check your session and try refreshing.
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No open procurement orders"
              description="Sync from Zenoti to pull RAISED or UPDATED orders, or all stores are fully fulfilled."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Deliver by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => {
                  const fs = order.fulfillment?.status;
                  const isSubmittedOrInvoiced = ["SUBMITTED","INVOICED"].includes(fs);
                  return (
                    <TableRow
                      key={order.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50 transition-colors",
                        isSubmittedOrInvoiced && "opacity-60",
                      )}
                      onClick={() => router.push(`/zenoti/${order.id}`)}
                    >
                      <TableCell className="font-mono font-semibold">#{order.orderNumber}</TableCell>
                      <TableCell className="font-medium">{order.centerName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {order.org === "bfs" ? "BF Spa" : "BL"}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          ZENOTI_STATUS_CONFIG[order.zenotiStatus]?.colour ?? "text-muted-foreground",
                        )}>
                          {ZENOTI_STATUS_CONFIG[order.zenotiStatus]?.label ?? order.zenotiStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <FulfillmentIcon status={fs} />
                          {fs ? (
                            <Badge variant={STATUS_CONFIG[fs]?.variant ?? "secondary"} className="text-xs">
                              {STATUS_CONFIG[fs]?.label ?? fs}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{order.items.length}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {order.raisedAt
                          ? formatDistanceToNow(new Date(order.raisedAt), { addSuffix: true })
                          : "—"}
                      </TableCell>
                      <TableCell className={cn(
                        "text-sm",
                        order.deliverBy && new Date(order.deliverBy) < new Date()
                          ? "text-destructive font-medium"
                          : "text-muted-foreground",
                      )}>
                        {order.deliverBy
                          ? new Date(order.deliverBy).toLocaleDateString("en-CA")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{count}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
