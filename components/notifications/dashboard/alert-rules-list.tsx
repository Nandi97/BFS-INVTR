"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Bell, BellOff, MoreHorizontal, Plus, Pencil, Trash2,
  PackageX, Package, RefreshCcw, BarChart3, ShoppingCart, PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertRuleForm } from "@/components/notifications/create/alert-rule-form";
import { useAlertRules, useUpdateRule, useDeleteRule, type AlertRule, type AlertType } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<AlertType, { label: string; icon: React.ElementType; color: string }> = {
  OUT_OF_STOCK:   { label: "Out of Stock",    icon: PackageX,     color: "text-destructive" },
  LOW_STOCK:      { label: "Low Stock",       icon: Package,      color: "text-amber-600 dark:text-amber-400" },
  REORDER_NEEDED: { label: "Reorder Needed",  icon: RefreshCcw,   color: "text-blue-600 dark:text-blue-400" },
  DAILY_DIGEST:   { label: "Daily Digest",    icon: BarChart3,    color: "text-purple-600 dark:text-purple-400" },
  PO_SENT:        { label: "PO Sent",         icon: ShoppingCart, color: "text-muted-foreground" },
  PO_RECEIVED:    { label: "PO Received",     icon: PackageCheck, color: "text-emerald-600 dark:text-emerald-400" },
};

interface AlertRulesListProps {
  onAdd: () => void;
}

export function AlertRulesList({ onAdd }: AlertRulesListProps) {
  const [editRule, setEditRule]     = useState<AlertRule | null>(null);
  const [deleteRule, setDeleteRule] = useState<AlertRule | null>(null);

  const { data: rules = [], isLoading } = useAlertRules();
  const updateRule = useUpdateRule();
  const deleteRuleMutation = useDeleteRule();

  async function handleToggle(rule: AlertRule) {
    try {
      await updateRule.mutateAsync({ id: rule.id, isActive: !rule.isActive });
    } catch {
      toast.error("Failed to update rule");
    }
  }

  async function handleDelete() {
    if (!deleteRule) return;
    try {
      await deleteRuleMutation.mutateAsync(deleteRule.id);
      toast.success("Rule deleted");
      setDeleteRule(null);
    } catch {
      toast.error("Failed to delete rule");
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl border bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
        <Bell className="size-10 text-muted-foreground mb-4" />
        <p className="font-medium text-sm">No alert rules configured</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Add your first rule to start receiving email notifications about stock levels.
        </p>
        <Button className="mt-4" onClick={onAdd}>
          <Plus className="mr-2 size-4" /> Add First Rule
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {rules.map((rule) => {
          const cfg  = TYPE_CONFIG[rule.type] ?? TYPE_CONFIG.DAILY_DIGEST;
          const Icon = cfg.icon;
          return (
            <Card key={rule.id} className={cn(!rule.isActive && "opacity-60")}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2.5">
                  <div className={cn("mt-0.5", cfg.color)}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{rule.name}</CardTitle>
                    <CardDescription className="text-xs">{cfg.label}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() => handleToggle(rule)}
                    className="scale-90"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditRule(rule)}>
                        <Pencil className="mr-2 size-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteRule(rule)}
                      >
                        <Trash2 className="mr-2 size-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {rule.recipients.map((r) => (
                    <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                  ))}
                </div>
                {rule.lastTriggeredAt && (
                  <p className="text-xs text-muted-foreground">
                    Last sent {format(new Date(rule.lastTriggeredAt), "MMM d, yyyy HH:mm")}
                  </p>
                )}
                {!rule.lastTriggeredAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <BellOff className="size-3" /> Never triggered
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertRuleForm
        open={!!editRule}
        onOpenChange={(o) => !o && setEditRule(null)}
        rule={editRule}
      />

      <AlertDialog open={!!deleteRule} onOpenChange={(o) => !o && setDeleteRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteRule?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This alert rule will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
