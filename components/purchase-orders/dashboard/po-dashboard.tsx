'use client';

import { useState } from 'react';
import { Plus, FileText, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PoKpiCard } from './po-kpi-card';
import { POTable } from './po-table';
import { POForm } from '@/components/purchase-orders/create/po-form';
import { usePurchaseOrders } from '@/hooks/use-purchase-orders';

export function PoDashboard() {
	const [formOpen, setFormOpen] = useState(false);

	const { data: all } = usePurchaseOrders({ limit: 1 });
	const { data: drafts } = usePurchaseOrders({ status: 'DRAFT', limit: 1 });
	const { data: sent } = usePurchaseOrders({ status: 'SENT', limit: 1 });
	const { data: partial } = usePurchaseOrders({
		status: 'PARTIALLY_RECEIVED',
		limit: 1,
	});

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Purchase Orders
					</h1>
					<p className="text-muted-foreground mt-0.5 text-sm">
						Manage supplier orders and track deliveries
					</p>
				</div>
				<Button onClick={() => setFormOpen(true)}>
					<Plus className="mr-2 size-4" />
					New PO
				</Button>
			</div>

			{/* KPI cards */}
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<PoKpiCard
					title="Total Orders"
					value={all?.total ?? 0}
					icon={FileText}
					description="all time"
				/>
				<PoKpiCard
					title="Drafts"
					value={drafts?.total ?? 0}
					icon={FileText}
					description="not yet sent"
				/>
				<PoKpiCard
					title="Sent / Awaiting"
					value={sent?.total ?? 0}
					icon={Clock}
					description="pending delivery"
				/>
				<PoKpiCard
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
