import { Suspense } from 'react';
import {
	Package,
	AlertTriangle,
	TrendingDown,
	CheckCircle,
} from 'lucide-react';
import { KpiCard } from './kpi-card';
import { StockHealthChart } from './stock-health-chart';
import { UrgentReorderTable } from './urgent-reorder-table';
import { RecentMovementsTable } from './recent-movements-table';
import { Skeleton } from '@/components/ui/skeleton';
import { prisma } from '@/lib/prisma';

export function DashboardView() {
	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-semibold">Dashboard</h1>

			{/* KPI row */}
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Suspense fallback={<Skeleton className="h-24" />}>
					<KpiCards />
				</Suspense>
			</div>

			{/* Status breakdown + urgent table */}
			<div className="grid gap-4 lg:grid-cols-3">
				<div className="lg:col-span-1">
					<StockHealthChart />
				</div>
				<div className="lg:col-span-2">
					<Suspense fallback={<Skeleton className="h-72" />}>
						<UrgentReorderTable />
					</Suspense>
				</div>
			</div>

			{/* Recent movements */}
			<RecentMovementsTable />
		</div>
	);
}

async function KpiCards() {
	const [totalProducts, reorderRows] = await Promise.all([
		prisma.product.count({ where: { isActive: true } }),
		prisma.inventory.findMany({
			where: { product: { isActive: true } },
			select: { quantity: true, reorderPoint: true },
		}),
	]);

	const outOfStock = reorderRows.filter((r) => r.quantity <= 0).length;
	const lowStock = reorderRows.filter(
		(r) =>
			r.quantity > 0 && r.reorderPoint > 0 && r.quantity <= r.reorderPoint
	).length;
	const okStock = reorderRows.filter(
		(r) => r.reorderPoint === 0 || r.quantity > r.reorderPoint
	).length;

	return (
		<>
			<KpiCard
				title="Total SKUs"
				value={totalProducts}
				icon={Package}
				description="active products"
			/>
			<KpiCard
				title="Out of Stock"
				value={outOfStock}
				icon={AlertTriangle}
				description="zero quantity"
				variant="destructive"
			/>
			<KpiCard
				title="Low Stock"
				value={lowStock}
				icon={TrendingDown}
				description="at or below reorder point"
				variant="warning"
			/>
			<KpiCard
				title="Healthy"
				value={okStock}
				icon={CheckCircle}
				description="above reorder point"
				variant="success"
			/>
		</>
	);
}
