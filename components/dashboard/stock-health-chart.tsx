'use client';

import * as React from 'react';
import { Label, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from '@/components/ui/chart';
import { useStock } from '@/hooks/use-stock';

const chartConfig: ChartConfig = {
	count: { label: 'SKUs' },
	out: { label: 'Out of stock', color: 'var(--destructive)' },
	urgent: { label: 'Reorder now', color: 'var(--chart-1, #f59e0b)' },
	low: { label: 'Running low', color: 'var(--chart-2, #eab308)' },
	ok: { label: 'Healthy', color: 'var(--chart-3, #22c55e)' },
};

export function StockHealthChart() {
	const { data, isLoading } = useStock({ limit: 2000 });
	const rows = data?.data ?? [];

	const counts = React.useMemo(
		() => ({
			out: rows.filter((r) => r.quantity <= 0).length,
			urgent: rows.filter(
				(r) =>
					r.quantity > 0 &&
					r.reorderPoint > 0 &&
					r.quantity <= r.reorderPoint
			).length,
			low: rows.filter(
				(r) =>
					r.quantity > 0 &&
					r.reorderPoint > 0 &&
					r.quantity > r.reorderPoint &&
					r.quantity <= r.reorderPoint * 2
			).length,
			ok: rows.filter(
				(r) =>
					r.quantity > 0 &&
					(r.reorderPoint === 0 || r.quantity > r.reorderPoint * 2)
			).length,
		}),
		[rows]
	);

	const total = rows.length;

	const chartData = [
		{ status: 'out', count: counts.out, fill: 'var(--color-out)' },
		{ status: 'urgent', count: counts.urgent, fill: 'var(--color-urgent)' },
		{ status: 'low', count: counts.low, fill: 'var(--color-low)' },
		{ status: 'ok', count: counts.ok, fill: 'var(--color-ok)' },
	].filter((d) => d.count > 0);

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle className="text-base">Stock Status</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-8 w-full" />
						))}
					</div>
				) : total === 0 ? (
					<p className="text-muted-foreground py-8 text-center text-sm">
						No stock data yet.
					</p>
				) : (
					<>
						<ChartContainer
							config={chartConfig}
							className="mx-auto aspect-square h-[200px]"
						>
							<PieChart>
								<defs>
									{(
										['out', 'urgent', 'low', 'ok'] as const
									).map((key, i) => (
										<linearGradient
											key={key}
											id={`fill-${key}`}
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="0%"
												stopColor={`var(--color-${key})`}
												stopOpacity={1 - i * 0.05}
											/>
											<stop
												offset="100%"
												stopColor={`var(--color-${key})`}
												stopOpacity={0.85 - i * 0.05}
											/>
										</linearGradient>
									))}
								</defs>
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent hideLabel />}
								/>
								<Pie
									data={chartData.map((d) => ({
										...d,
										fill: `url(#fill-${d.status})`,
									}))}
									dataKey="count"
									nameKey="status"
									innerRadius={56}
									strokeWidth={2}
									stroke="var(--background)"
								>
									<Label
										content={({ viewBox }) => {
											if (
												viewBox &&
												'cx' in viewBox &&
												'cy' in viewBox
											) {
												return (
													<text
														x={viewBox.cx}
														y={viewBox.cy}
														textAnchor="middle"
														dominantBaseline="middle"
													>
														<tspan
															x={viewBox.cx}
															y={viewBox.cy}
															className="fill-foreground text-2xl font-semibold"
														>
															{total.toLocaleString()}
														</tspan>
														<tspan
															x={viewBox.cx}
															y={
																(viewBox.cy ||
																	0) + 20
															}
															className="fill-muted-foreground text-xs"
														>
															Total SKUs
														</tspan>
													</text>
												);
											}
										}}
									/>
								</Pie>
							</PieChart>
						</ChartContainer>

						{/* Legend */}
						<div className="mt-1 space-y-1.5">
							{(['out', 'urgent', 'low', 'ok'] as const).map(
								(key) => {
									const n = counts[key];
									const pct =
										total > 0
											? Math.round((n / total) * 100)
											: 0;
									if (n === 0 && key !== 'ok') return null;
									return (
										<div
											key={key}
											className="flex items-center justify-between text-sm"
										>
											<div className="flex items-center gap-2">
												<div
													className="size-2 shrink-0 rounded-sm"
													style={{
														backgroundColor: `var(--color-${key})`,
													}}
												/>
												<span className="text-muted-foreground">
													{chartConfig[key].label}
												</span>
											</div>
											<div className="flex items-center gap-2 tabular-nums">
												<span className="font-medium">
													{n}
												</span>
												<span className="text-muted-foreground w-7 text-right text-xs">
													{pct}%
												</span>
											</div>
										</div>
									);
								}
							)}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
