'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilters } from './report-filters';
import { useMovementsReport } from '@/hooks/use-reports';
import { useLocations } from '@/hooks/use-locations';
import { useBrands } from '@/hooks/use-brands';
import { exportCsv } from '@/lib/csv-export';

const MOVEMENT_TYPES = [
	'PURCHASE_RECEIPT',
	'SALE',
	'ADJUSTMENT_IN',
	'ADJUSTMENT_OUT',
	'TRANSFER_IN',
	'TRANSFER_OUT',
	'OPENING_STOCK',
	'RECONCILIATION',
];

const TYPE_VARIANT: Record<
	string,
	'default' | 'secondary' | 'outline' | 'destructive'
> = {
	PURCHASE_RECEIPT: 'default',
	SALE: 'secondary',
	ADJUSTMENT_IN: 'outline',
	ADJUSTMENT_OUT: 'outline',
	TRANSFER_IN: 'outline',
	TRANSFER_OUT: 'outline',
	OPENING_STOCK: 'secondary',
	RECONCILIATION: 'secondary',
};

const EMPTY = { from: '', to: '', locationId: '', brandId: '', type: '' };

export function MovementsReport() {
	const [filters, setFilters] = useState(EMPTY);

	const { data, isLoading } = useMovementsReport({
		from: filters.from || undefined,
		to: filters.to || undefined,
		locationId: filters.locationId || undefined,
		brandId: filters.brandId || undefined,
		type: filters.type || undefined,
	});

	const { data: locations = [] } = useLocations();
	const { data: brands } = useBrands();

	const rows = data?.data ?? [];
	const brandList =
		(brands as { id: string; name: string }[] | undefined) ?? [];

	function onExport() {
		exportCsv(
			`movements-${filters.from || 'all'}-to-${filters.to || 'all'}.csv`,
			[
				'Date',
				'Product',
				'SKU',
				'Brand',
				'Location',
				'Type',
				'Quantity',
				'Balance After',
				'Reference',
				'Notes',
			],
			rows.map((r) => [
				format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm'),
				r.productName,
				r.sku,
				r.brand,
				r.location,
				r.type,
				r.quantity,
				r.balanceAfter,
				r.reference,
				r.notes,
			])
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Movements Report</CardTitle>
				<CardDescription>
					All stock movements in the selected date range (max 2,000
					rows)
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<ReportFilters
					filters={[
						{ key: 'from', label: 'From', type: 'date' },
						{ key: 'to', label: 'To', type: 'date' },
						{
							key: 'locationId',
							label: 'Location',
							type: 'select',
							options: (
								locations as { id: string; name: string }[]
							).map((l) => ({ value: l.id, label: l.name })),
						},
						{
							key: 'brandId',
							label: 'Brand',
							type: 'select',
							options: brandList.map((b) => ({
								value: b.id,
								label: b.name,
							})),
						},
						{
							key: 'type',
							label: 'Type',
							type: 'select',
							options: MOVEMENT_TYPES.map((t) => ({
								value: t,
								label: t.replace(/_/g, ' '),
							})),
						},
					]}
					values={filters}
					onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
					onReset={() => setFilters(EMPTY)}
					onExport={onExport}
					total={rows.length}
				/>

				{!isLoading && data && (
					<div className="bg-muted/30 flex gap-6 rounded-lg border px-4 py-3">
						<div>
							<p className="text-muted-foreground text-xs">
								Units In
							</p>
							<p className="text-lg font-semibold text-green-600 dark:text-green-400">
								+{data.totalIn.toLocaleString()}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">
								Units Out
							</p>
							<p className="text-destructive text-lg font-semibold">
								−{data.totalOut.toLocaleString()}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Net</p>
							<p className="text-lg font-semibold">
								{(
									data.totalIn - data.totalOut
								).toLocaleString()}
							</p>
						</div>
					</div>
				)}

				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 8 }).map((_, i) => (
							<Skeleton key={i} className="h-8 w-full" />
						))}
					</div>
				) : (
					<div className="max-h-[520px] overflow-auto rounded-md border">
						<Table>
							<TableHeader className="bg-background sticky top-0 z-10">
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Product</TableHead>
									<TableHead>Brand</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Type</TableHead>
									<TableHead className="text-right">
										Qty
									</TableHead>
									<TableHead className="text-right">
										Balance After
									</TableHead>
									<TableHead>Reference</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={8}
											className="text-muted-foreground py-10 text-center"
										>
											No movements in this range
										</TableCell>
									</TableRow>
								) : (
									rows.map((r) => (
										<TableRow key={r.id}>
											<TableCell className="text-muted-foreground text-xs whitespace-nowrap">
												{format(
													new Date(r.createdAt),
													'MMM d, yyyy HH:mm'
												)}
											</TableCell>
											<TableCell>
												<div className="text-sm leading-tight font-medium">
													{r.productName}
												</div>
												{r.sku && (
													<div className="text-muted-foreground text-xs">
														{r.sku}
													</div>
												)}
											</TableCell>
											<TableCell>
												{r.brand ? (
													<Badge
														variant="secondary"
														className="text-xs font-normal"
													>
														{r.brand}
													</Badge>
												) : (
													<span className="text-muted-foreground">
														—
													</span>
												)}
											</TableCell>
											<TableCell className="text-sm">
												{r.location}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														TYPE_VARIANT[r.type] ??
														'outline'
													}
													className="text-xs whitespace-nowrap"
												>
													{r.type.replace(/_/g, ' ')}
												</Badge>
											</TableCell>
											<TableCell className="text-right font-medium tabular-nums">
												{r.quantity}
											</TableCell>
											<TableCell className="text-muted-foreground text-right tabular-nums">
												{r.balanceAfter}
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{r.reference ?? '—'}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
