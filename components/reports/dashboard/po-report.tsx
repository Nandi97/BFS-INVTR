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
import { usePoReport } from '@/hooks/use-reports';
import { useSuppliers } from '@/hooks/use-suppliers';
import { exportCsv } from '@/lib/csv-export';

const STATUS_VARIANT: Record<
	string,
	'default' | 'secondary' | 'outline' | 'destructive'
> = {
	DRAFT: 'outline',
	SENT: 'secondary',
	PARTIALLY_RECEIVED: 'default',
	RECEIVED: 'default',
	CANCELLED: 'destructive',
};

const PO_STATUSES = [
	'DRAFT',
	'SENT',
	'PARTIALLY_RECEIVED',
	'RECEIVED',
	'CANCELLED',
];

const EMPTY = { from: '', to: '', supplierId: '', status: '' };

export function PoReport() {
	const [filters, setFilters] = useState(EMPTY);

	const { data, isLoading } = usePoReport({
		from: filters.from || undefined,
		to: filters.to || undefined,
		supplierId: filters.supplierId || undefined,
		status: filters.status || undefined,
	});

	const { data: suppData } = useSuppliers({ limit: 200 });
	const suppliers = suppData?.data ?? [];
	const rows = data?.data ?? [];

	function onExport() {
		exportCsv(
			`purchase-orders-${filters.from || 'all'}-to-${filters.to || 'all'}.csv`,
			[
				'PO Number',
				'Created',
				'Sent',
				'Received',
				'Supplier',
				'Location',
				'Status',
				'Lines',
				'Ordered Qty',
				'Received Qty',
				'Total Cost',
			],
			rows.map((r) => [
				r.poNumber,
				format(new Date(r.createdAt), 'yyyy-MM-dd'),
				r.sentAt ? format(new Date(r.sentAt), 'yyyy-MM-dd') : '',
				r.receivedAt
					? format(new Date(r.receivedAt), 'yyyy-MM-dd')
					: '',
				r.supplier,
				r.location,
				r.status,
				r.lineItems,
				r.totalOrdered,
				r.totalReceived,
				r.totalCost > 0 ? r.totalCost : '',
			])
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">
					Purchase Orders Report
				</CardTitle>
				<CardDescription>
					PO history with totals and receiving status
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<ReportFilters
					filters={[
						{ key: 'from', label: 'From', type: 'date' },
						{ key: 'to', label: 'To', type: 'date' },
						{
							key: 'supplierId',
							label: 'Supplier',
							type: 'select',
							options: suppliers.map(
								(s: { id: string; name: string }) => ({
									value: s.id,
									label: s.name,
								})
							),
						},
						{
							key: 'status',
							label: 'Status',
							type: 'select',
							options: PO_STATUSES.map((s) => ({
								value: s,
								label: s.replace(/_/g, ' '),
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
								Total POs
							</p>
							<p className="text-lg font-semibold">
								{data.total}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">
								Total Units Ordered
							</p>
							<p className="text-lg font-semibold">
								{data.totalOrdered.toLocaleString()}
							</p>
						</div>
						{data.grandTotal > 0 && (
							<div>
								<p className="text-muted-foreground text-xs">
									Grand Total Cost
								</p>
								<p className="text-lg font-semibold">
									$
									{data.grandTotal.toLocaleString(undefined, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}
								</p>
							</div>
						)}
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
									<TableHead>PO Number</TableHead>
									<TableHead>Supplier</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Created</TableHead>
									<TableHead className="text-right">
										Lines
									</TableHead>
									<TableHead className="text-right">
										Ordered
									</TableHead>
									<TableHead className="text-right">
										Received
									</TableHead>
									<TableHead className="text-right">
										Cost
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={9}
											className="text-muted-foreground py-10 text-center"
										>
											No purchase orders
										</TableCell>
									</TableRow>
								) : (
									rows.map((r) => (
										<TableRow key={r.id}>
											<TableCell className="font-mono text-sm font-medium">
												{r.poNumber}
											</TableCell>
											<TableCell className="text-sm">
												{r.supplier}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{r.location}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														STATUS_VARIANT[
															r.status
														] ?? 'outline'
													}
													className="text-xs"
												>
													{r.status.replace(
														/_/g,
														' '
													)}
												</Badge>
											</TableCell>
											<TableCell className="text-muted-foreground text-sm whitespace-nowrap">
												{format(
													new Date(r.createdAt),
													'MMM d, yyyy'
												)}
											</TableCell>
											<TableCell className="text-right text-sm tabular-nums">
												{r.lineItems}
											</TableCell>
											<TableCell className="text-right text-sm tabular-nums">
												{r.totalOrdered}
											</TableCell>
											<TableCell className="text-muted-foreground text-right text-sm tabular-nums">
												{r.totalReceived}
											</TableCell>
											<TableCell className="text-right text-sm tabular-nums">
												{r.totalCost > 0 ? (
													`$${r.totalCost.toFixed(2)}`
												) : (
													<span className="text-muted-foreground">
														—
													</span>
												)}
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
