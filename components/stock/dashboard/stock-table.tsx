'use client';

import { useState } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	MoreHorizontal,
	Search,
	SlidersHorizontal,
	Warehouse,
} from 'lucide-react';
import {
	useStock,
	type StockStatus,
	type InventoryRow,
} from '@/hooks/use-stock';
import { useLocations } from '@/hooks/use-locations';
import { AdjustStockForm } from './adjust-stock-form';
import { SetThresholdsForm } from './set-thresholds-form';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

function statusOf(row: InventoryRow): 'out' | 'low' | 'ok' {
	if (row.quantity <= 0) return 'out';
	if (row.reorderPoint > 0 && row.quantity <= row.reorderPoint) return 'low';
	return 'ok';
}

function StockBadge({ row }: { row: InventoryRow }) {
	const s = statusOf(row);
	return (
		<Badge
			variant="outline"
			className={cn(
				'text-xs',
				s === 'out' && 'border-destructive text-destructive',
				s === 'low' &&
					'border-amber-500 text-amber-600 dark:text-amber-400',
				s === 'ok' &&
					'border-emerald-500 text-emerald-600 dark:text-emerald-400'
			)}
		>
			{s === 'out'
				? 'Out of Stock'
				: s === 'low'
					? 'Low Stock'
					: 'In Stock'}
		</Badge>
	);
}

export function StockTable({
	defaultLocationId,
}: {
	defaultLocationId?: string;
}) {
	const [search, setSearch] = useState('');
	const [status, setStatus] = useState<StockStatus>('all');
	const [locationId, setLocationId] = useState(defaultLocationId ?? 'all');
	const [adjustRow, setAdjustRow] = useState<InventoryRow | null>(null);
	const [thresholdRow, setThresholdRow] = useState<InventoryRow | null>(null);

	const { data: stockData, isLoading } = useStock({
		search: search || undefined,
		status,
		locationId: locationId === 'all' ? undefined : locationId,
		limit: 100,
	});

	const { data: locations } = useLocations({ active: true });

	const rows = stockData?.data ?? [];

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap gap-2">
				<div className="relative min-w-48 flex-1">
					<Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
					<Input
						placeholder="Search products…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-8"
					/>
				</div>

				<Select value={locationId} onValueChange={setLocationId}>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Location" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Locations</SelectItem>
						{locations?.map((loc) => (
							<SelectItem key={loc.id} value={loc.id}>
								{loc.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={status}
					onValueChange={(v) => setStatus(v as StockStatus)}
				>
					<SelectTrigger className="w-36">
						<SlidersHorizontal className="text-muted-foreground mr-2 size-3.5" />
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="low">Low Stock</SelectItem>
						<SelectItem value="out">Out of Stock</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Product</TableHead>
							<TableHead>Brand</TableHead>
							<TableHead>SKU / Barcode</TableHead>
							<TableHead>Location</TableHead>
							<TableHead className="text-right">Qty</TableHead>
							<TableHead className="text-right">Min</TableHead>
							<TableHead className="text-right">
								Reorder At
							</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 8 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 9 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={9} className="h-48">
									<EmptyState
										icon={Warehouse}
										title="No stock records found"
										description="Try clearing your filters or adjusting the location and status selectors."
									/>
								</TableCell>
							</TableRow>
						) : (
							rows.map((row) => (
								<TableRow key={row.id}>
									<TableCell className="font-medium">
										{row.product.name}
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{row.product.brand?.name ?? '—'}
									</TableCell>
									<TableCell className="text-muted-foreground font-mono text-sm">
										{row.product.sku ??
											row.product.barcode ??
											'—'}
									</TableCell>
									<TableCell className="text-sm">
										{row.location.name}
									</TableCell>
									<TableCell className="text-right font-mono font-medium">
										{row.quantity}
									</TableCell>
									<TableCell className="text-muted-foreground text-right font-mono text-sm">
										{row.minQuantity || '—'}
									</TableCell>
									<TableCell className="text-muted-foreground text-right font-mono text-sm">
										{row.reorderPoint || '—'}
									</TableCell>
									<TableCell>
										<StockBadge row={row} />
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="size-7"
												>
													<MoreHorizontal className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() =>
														setAdjustRow(row)
													}
												>
													Adjust Stock
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() =>
														setThresholdRow(row)
													}
												>
													Set Thresholds
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{stockData && (
				<p className="text-muted-foreground text-xs">
					Showing {rows.length} of {stockData.total} records
				</p>
			)}

			<AdjustStockForm
				open={!!adjustRow}
				onOpenChange={(o) => !o && setAdjustRow(null)}
				row={adjustRow}
			/>
			<SetThresholdsForm
				open={!!thresholdRow}
				onOpenChange={(o) => !o && setThresholdRow(null)}
				row={thresholdRow}
			/>
		</div>
	);
}
