import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockPolicyTable } from "./stock-policy-table";
import { BrandLeadTimesTable } from "./brand-lead-times-table";
import { UserTable } from "./user-table";
import { Package, Clock, Users } from "lucide-react";

export function SettingsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure reorder policies, lead times, and stock targets for each brand and product.
        </p>
      </div>

      <Tabs defaultValue="stock-policy">
        <TabsList className="mb-6">
          <TabsTrigger value="stock-policy" className="gap-2">
            <Package className="size-3.5" />
            Stock Policy
          </TabsTrigger>
          <TabsTrigger value="lead-times" className="gap-2">
            <Clock className="size-3.5" />
            Brand Lead Times
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="size-3.5" />
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock-policy" className="space-y-4 mt-0">
          <div className="space-y-1">
            <h2 className="text-base font-medium">Target Stock Months — per product</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              How many months of stock to order at each restock. Local high-volume products typically
              need 2 months; international non-perishables 6–12 months.
              The <strong>Reorder Qty</strong> column is a live preview — save changes, then click
              <strong> Recalculate</strong> to apply to the Reorder page.
            </p>
          </div>
          <StockPolicyTable />
        </TabsContent>

        <TabsContent value="lead-times" className="space-y-4 mt-0">
          <div className="space-y-1">
            <h2 className="text-base font-medium">Brand Lead Times</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              How many days it takes for an order to arrive from each brand.
              This drives the <strong>Reorder Point</strong> — the stock level at which you should
              place an order so it arrives before you run out.
              Local suppliers (≤20 days) are marked <span className="text-green-700 dark:text-green-400 font-medium">Local</span>;
              all others are <span className="text-blue-700 dark:text-blue-400 font-medium">International</span>.
            </p>
          </div>
          <BrandLeadTimesTable />
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-0">
          <div className="space-y-1">
            <h2 className="text-base font-medium">Team Members</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Manage who has access to BFS Inventory and their permission level.
              Admins can manage users and settings; Managers can create and edit records;
              Viewers have read-only access.
            </p>
          </div>
          <UserTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
