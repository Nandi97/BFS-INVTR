'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportFilters } from './report-filters';
import { useDispatchByStoreReport } from '@/hooks/use-reports';
import { useBrands } from '@/hooks/use-brands';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import ExcelJS from 'exceljs';

const EMPTY = { dateFrom: '', dateTo: '', brandId: '' };

async function exportXlsx(
	stores: string[],
	products: ReturnType<
		typeof useDispatchByStoreReport
	>['data'] extends infer T
		? T extends { products: infer P }
			? P
			: never
		: never,
	dateFrom: string | null,
	dateTo: string | null
) {
	const wb = new ExcelJS.Workbook();
	wb.creator = 'BFS Inventory';
	wb.created = new Date();

	const ws = wb.addWorksheet('Dispatch by Store');
	ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];

	// Meta row
	const metaRow = ws.addRow([
		`Dispatch Report · ${dateFrom ?? 'all time'} → ${dateTo ?? 'today'}`,
		...stores.map(() => ''),
		'',
		'',
	]);
	metaRow.font = { bold: true, size: 11 };
	ws.addRow([]); // spacer

	// Header
	const headers = [
		'Product',
		'Brand',
		...stores,
		'Total',
		'Unit Cost',
		'Total Value',
	];
	const headerRow = ws.addRow(headers);
	headerRow.eachCell((cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF111827' },
		};
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
		cell.alignment = { vertical: 'middle' };
	});
	headerRow.height = 22;

	// Set column widths
	ws.getColumn(1).width = 38;
	ws.getColumn(2).width = 20;
	stores.forEach((_, i) => {
		ws.getColumn(3 + i).width = 14;
	});
	ws.getColumn(3 + stores.length).width = 10; // Total
	ws.getColumn(3 + stores.length + 1).width = 11; // Unit Cost
	ws.getColumn(3 + stores.length + 2).width = 12; // Total Value

	// Data
	products?.forEach((p, i) => {
		const storeCols = stores.map((s) => p.byStore[s] ?? 0);
		const totalValue = p.unitCost != null ? p.total * p.unitCost : null;
		const row = ws.addRow([
			p.productName,
			p.brandName ?? '—',
			...storeCols,
			p.total,
			p.unitCost != null ? p.unitCost : null,
			totalValue,
		]);
		const shade = i % 2 === 1;
		row.eachCell({ includeEmpty: true }, (cell) => {
			if (shade)
				cell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: 'FFF9FAFB' },
				};
			cell.font = { size: 10 };
			cell.alignment = { vertical: 'middle' };
			cell.border = {
				bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
			};
		});
		row.height = 18;
	});

	// Totals row
	const storeTotals = stores.map((s) =>
		(products ?? []).reduce((sum, p) => sum + (p.byStore[s] ?? 0), 0)
	);
	const grandTotal = (products ?? []).reduce((sum, p) => sum + p.total, 0);
	const grandValue = (products ?? []).reduce(
		(sum, p) => sum + (p.unitCost != null ? p.total * p.unitCost : 0),
		0
	);

	const totalsRow = ws.addRow([
		`${products?.length ?? 0} products`,
		'',
		...storeTotals,
		grandTotal,
		'',
		grandValue > 0 ? grandValue : null,
	]);
	totalsRow.eachCell({ includeEmpty: true }, (cell) => {
		cell.fill = {
			type: 'pattern',
			pattern: 'solid',
			fgColor: { argb: 'FF111827' },
		};
		cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
		cell.border = { top: { style: 'thin', color: { argb: 'FF374151' } } };
	});
	totalsRow.height = 20;

	const raw = await wb.xlsx.writeBuffer();
	const blob = new Blob([raw], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `dispatch-by-store-${dateFrom ?? 'all'}-${dateTo ?? 'today'}.xlsx`;
	a.click();
	URL.revokeObjectURL(url);
}

export function DispatchByStoreReport() {
	const [filters, setFilters] = useState(EMPTY);
	const { data, isLoading } = useDispatchByStoreReport({
		dateFrom: filters.dateFrom || undefined,
		dateTo: filters.dateTo || undefined,
		brandId: filters.brandId || undefined,
	});

	const { data: brands } = useBrands();
	const brandList =
		(brands as { id: string; name: string }[] | undefined) ?? [];

	const stores = data?.stores ?? [];
	const products = data?.products ?? [];

	const storeTotals = stores.map((s) =>
		products.reduce((sum, p) => sum + (p.byStore[s] ?? 0), 0)
	);
	const grandTotal = products.reduce((sum, p) => sum + p.total, 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Dispatch by Store</CardTitle>
				<CardDescription>
					Units dispatched per product per store, sourced from QB
					invoice movements. Apply a date range to scope the report.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<ReportFilters
					filters={[
						{ key: 'dateFrom', label: 'From', type: 'date' },
						{ key: 'dateTo', label: 'To', type: 'date' },
						{
							key: 'brandId',
							label: 'Brand',
							type: 'select',
							options: brandList.map((b) => ({
								value: b.id,
								label: b.name,
							})),
						},
					]}
					values={filters}
					onChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
					onReset={() => setFilters(EMPTY)}
					total={products.length}
				/>

				{/* Summary bar */}
				{!isLoading && data && stores.length > 0 && (
					<div className="bg-muted/30 flex items-center justify-between rounded-lg border px-4 py-3">
						<div className="flex gap-6">
							<div>
								<p className="text-muted-foreground text-xs">
									Products
								</p>
								<p className="text-lg font-semibold">
									{products.length}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">
									Total Units Dispatched
								</p>
								<p className="text-lg font-semibold text-red-600 dark:text-red-400">
									−{grandTotal}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">
									Stores
								</p>
								<p className="text-lg font-semibold">
									{stores.length}
								</p>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled={products.length === 0}
							onClick={() =>
								exportXlsx(
									stores,
									products,
									data.dateFrom,
									data.dateTo
								)
							}
						>
							<Download className="mr-1.5 size-3.5" />
							Export Excel
						</Button>
					</div>
				)}

				{isLoading ? (
					<div className="space-y-2">
						{Array.from({ length: 8 }).map((_, i) => (
							<Skeleton key={i} className="h-8 w-full" />
						))}
					</div>
				) : stores.length === 0 ? (
					<div className="text-muted-foreground rounded-md border py-16 text-center text-sm">
						No dispatch movements with store attribution found.
						{!filters.dateFrom && !filters.dateTo && (
							<p className="mt-1 text-xs">
								Try applying a date range to scope the results.
							</p>
						)}
					</div>
				) : (
					<div className="max-h-[560px] overflow-auto rounded-md border">
						<Table>
							<TableHeader className="bg-background sticky top-0 z-10">
								<TableRow>
									<TableHead className="min-w-[200px]">
										Product
									</TableHead>
									<TableHead>Brand</TableHead>
									{stores.map((s) => (
										<TableHead
											key={s}
											className="min-w-[110px] text-right text-xs"
										>
											{s}
										</TableHead>
									))}
									<TableHead className="text-right font-semibold">
										Total
									</TableHead>
									<TableHead className="text-muted-foreground text-right">
										Unit Cost
									</TableHead>
									<TableHead className="text-muted-foreground text-right">
										Total Value
									</TableHead>
								</TableRow>
								{/* Store totals sub-header */}
								<TableRow className="bg-muted/40 text-muted-foreground text-xs">
									<TableCell
										colSpan={2}
										className="py-1 font-medium"
									>
										All products
									</TableCell>
									{storeTotals.map((t, i) => (
										<TableCell
											key={i}
											className="text-foreground py-1 text-right font-mono font-semibold"
										>
											{t > 0 ? t : '—'}
										</TableCell>
									))}
									<TableCell className="py-1 text-right font-mono font-bold text-red-600 dark:text-red-400">
										{grandTotal}
									</TableCell>
									<TableCell colSpan={2} />
								</TableRow>
							</TableHeader>
							<TableBody>
								{products.map((p) => {
									const totalValue =
										p.unitCost != null
											? p.total * p.unitCost
											: null;
									return (
										<TableRow key={p.productId}>
											<TableCell>
												<div className="text-sm leading-tight font-medium">
													{p.productName}
												</div>
											</TableCell>
											<TableCell>
												{p.brandName ? (
													<Badge
														variant="secondary"
														className="text-xs font-normal"
													>
														{p.brandName}
													</Badge>
												) : (
													<span className="text-muted-foreground">
														—
													</span>
												)}
											</TableCell>
											{stores.map((s) => {
												const qty = p.byStore[s] ?? 0;
												return (
													<TableCell
														key={s}
														className={cn(
															'text-right font-mono text-sm',
															qty > 0
																? 'font-medium text-red-600 dark:text-red-400'
																: 'text-muted-foreground'
														)}
													>
														{qty > 0 ? qty : '—'}
													</TableCell>
												);
											})}
											<TableCell className="text-right font-mono text-sm font-semibold">
												{p.total}
											</TableCell>
											<TableCell className="text-muted-foreground text-right font-mono text-sm">
												{p.unitCost != null
													? `$${p.unitCost.toFixed(2)}`
													: '—'}
											</TableCell>
											<TableCell className="text-right font-mono text-sm">
												{totalValue != null
													? `$${totalValue.toFixed(2)}`
													: '—'}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
