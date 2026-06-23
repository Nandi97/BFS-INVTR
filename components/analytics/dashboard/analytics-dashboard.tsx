'use client';

import { useState } from 'react';
import {
	TrendingUp,
	Package,
	DollarSign,
	BarChart3,
	Upload,
} from 'lucide-react';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { MonthlySalesChart } from './monthly-sales-chart';
import { TopProductsTable } from './top-products-table';
import { SalesImportDialog } from './sales-import-dialog';
import { AnalyticsKpiCard } from './analytics-kpi-card';
import { useSalesSummary } from '@/hooks/use-sales';
import { useBrands } from '@/hooks/use-brands';

type ChartMode = 'quantity' | 'revenue';

function pct(a: number, b: number) {
	if (b === 0) return a > 0 ? '+100% vs last year' : '—';
	const d = ((a - b) / b) * 100;
	return `${d >= 0 ? '+' : ''}${d.toFixed(1)}% vs last year`;
}

export function AnalyticsDashboard() {
	const currentYear = new Date().getFullYear();
	const [year, setYear] = useState(currentYear);
	const [brandId, setBrandId] = useState<string | undefined>();
	const [chartMode, setChartMode] = useState<ChartMode>('quantity');

	const { data: summary, isLoading } = useSalesSummary(year, brandId);
	const { data: brands } = useBrands();

	const availableYears = summary?.availableYears?.length
		? summary.availableYears
		: [currentYear];

	const totalQty = summary?.yoy.thisYear.qty ?? 0;
	const totalRev = summary?.yoy.thisYear.revenue ?? 0;
	const lastQty = summary?.yoy.lastYear.qty ?? 0;
	const lastRev = summary?.yoy.lastYear.revenue ?? 0;
	const products = summary?.productsTracked ?? 0;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Sales History
					</h1>
					<p className="text-muted-foreground mt-0.5 text-sm">
						Monthly sales trends and top-performing products
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Select
						value={brandId ?? 'all'}
						onValueChange={(v) =>
							setBrandId(v === 'all' ? undefined : v)
						}
					>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="All brands" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All brands</SelectItem>
							{(
								brands as
									| { id: string; name: string }[]
									| undefined
							)?.map((b) => (
								<SelectItem key={b.id} value={b.id}>
									{b.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select
						value={String(year)}
						onValueChange={(v) => setYear(Number(v))}
					>
						<SelectTrigger className="w-28">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{availableYears.map((y) => (
								<SelectItem key={y} value={String(y)}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<SalesImportDialog>
						<Button variant="outline" size="sm">
							<Upload className="mr-2 h-4 w-4" />
							Import
						</Button>
					</SalesImportDialog>
				</div>
			</div>

			{/* KPI row */}
			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="pt-6">
								<Skeleton className="h-12 w-full" />
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<AnalyticsKpiCard
						title="Total Units Sold"
						value={totalQty.toLocaleString()}
						sub={pct(totalQty, lastQty)}
						icon={Package}
					/>
					<AnalyticsKpiCard
						title="Total Revenue"
						value={`$${totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
						sub={pct(totalRev, lastRev)}
						icon={DollarSign}
					/>
					<AnalyticsKpiCard
						title="Products Tracked"
						value={String(products)}
						sub={`with sales in ${year}`}
						icon={BarChart3}
					/>
					<AnalyticsKpiCard
						title="Avg Monthly Units"
						value={
							totalQty > 0
								? Math.round(totalQty / 12).toLocaleString()
								: '—'
						}
						sub="across all months"
						icon={TrendingUp}
					/>
				</div>
			)}

			{/* Monthly chart */}
			<Card>
				<CardHeader className="flex flex-row items-start justify-between pb-2">
					<div>
						<CardTitle className="text-base">
							Monthly Breakdown — {year}
						</CardTitle>
						<CardDescription>
							Units sold and revenue per month
						</CardDescription>
					</div>
					<Tabs
						value={chartMode}
						onValueChange={(v) => setChartMode(v as ChartMode)}
					>
						<TabsList className="h-8">
							<TabsTrigger
								value="quantity"
								className="px-3 text-xs"
							>
								Units
							</TabsTrigger>
							<TabsTrigger
								value="revenue"
								className="px-3 text-xs"
							>
								Revenue
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<Skeleton className="h-64 w-full" />
					) : (
						<MonthlySalesChart
							data={summary?.monthly ?? []}
							mode={chartMode}
						/>
					)}
				</CardContent>
			</Card>

			{/* Top products */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">
						Top Products — {year}
					</CardTitle>
					<CardDescription>
						Ranked by total units sold (top 15)
					</CardDescription>
				</CardHeader>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="space-y-3 p-6">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-8 w-full" />
							))}
						</div>
					) : (
						<TopProductsTable
							products={summary?.topProducts ?? []}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
