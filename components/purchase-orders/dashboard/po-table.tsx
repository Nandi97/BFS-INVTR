'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { POStatusBadge } from './po-status-badge';
import { PODetailSheet } from '@/components/purchase-orders/view/po-detail-sheet';
import { usePurchaseOrders, type POStatus } from '@/hooks/use-purchase-orders';
import { useSuppliers } from '@/hooks/use-suppliers';
import { format as fmt } from 'date-fns';

const ALL_STATUSES: { label: string; value: POStatus | 'all' }[] = [
	{ label: 'All Status', value: 'all' },
	{ label: 'Draft', value: 'DRAFT' },
	{ label: 'Sent', value: 'SENT' },
	{ label: 'Partially Received', value: 'PARTIALLY_RECEIVED' },
	{ label: 'Received', value: 'RECEIVED' },
	{ label: 'Cancelled', value: 'CANCELLED' },
];

export function POTable() {
	const [status, setStatus] = useState<POStatus | 'all'>('all');
	const [supplierId, setSupplierId] = useState('all');
	const [openPoId, setOpenPoId] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const limit = 20;

	const { data, isLoading } = usePurchaseOrders({
		status: status === 'all' ? undefined : status,
		supplierId: supplierId === 'all' ? undefined : supplierId,
		page,
		limit,
	});

	const { data: suppliersData } = useSuppliers({ active: true, limit: 100 });

	const rows = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap gap-2">
				<Select
					value={status}
					onValueChange={(v) => {
						setStatus(v as typeof status);
						setPage(1);
					}}
				>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ALL_STATUSES.map((s) => (
							<SelectItem key={s.value} value={s.value}>
								{s.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={supplierId}
					onValueChange={(v) => {
						setSupplierId(v);
						setPage(1);
					}}
				>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="All Suppliers" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Suppliers</SelectItem>
						{suppliersData?.data.map((s) => (
							<SelectItem key={s.id} value={s.id}>
								{s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>PO Number</TableHead>
							<TableHead>Supplier</TableHead>
							<TableHead>Location</TableHead>
							<TableHead className="text-right">Items</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
							<TableHead>Sent</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 8 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton className="h-4 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={8}
									className="h-40 text-center"
								>
									<div className="text-muted-foreground flex flex-col items-center gap-2">
										<FileText className="size-8" />
										<span className="font-medium">
											No purchase orders
										</span>
										<span className="text-xs">
											Create your first PO using the
											button above.
										</span>
									</div>
								</TableCell>
							</TableRow>
						) : (
							rows.map((po) => (
								<TableRow
									key={po.id}
									className="hover:bg-muted/50 cursor-pointer"
									onClick={() => setOpenPoId(po.id)}
								>
									<TableCell className="font-mono text-sm font-medium">
										{po.poNumber}
									</TableCell>
									<TableCell className="text-sm font-medium">
										{po.supplier.name}
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{po.location.name}
									</TableCell>
									<TableCell className="text-muted-foreground text-right font-mono text-sm">
										{po._count?.items ?? 0}
									</TableCell>
									<TableCell>
										<POStatusBadge status={po.status} />
									</TableCell>
									<TableCell className="text-muted-foreground text-sm whitespace-nowrap">
										{format(
											new Date(po.createdAt),
											'MMM d, yyyy'
										)}
									</TableCell>
									<TableCell className="text-muted-foreground text-sm whitespace-nowrap">
										{po.sentAt
											? format(
													new Date(po.sentAt),
													'MMM d, yyyy'
												)
											: '—'}
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="sm"
											className="h-7 text-xs"
											onClick={(e) => {
												e.stopPropagation();
												setOpenPoId(po.id);
											}}
										>
											View
										</Button>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground text-xs">
					{total} order{total !== 1 ? 's' : ''}
				</p>
				{totalPages > 1 && (
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="icon"
							className="size-7"
							disabled={page <= 1}
							onClick={() => setPage((p) => p - 1)}
						>
							<ChevronLeft className="size-4" />
						</Button>
						<span className="text-muted-foreground px-1 text-xs">
							{page} / {totalPages}
						</span>
						<Button
							variant="outline"
							size="icon"
							className="size-7"
							disabled={page >= totalPages}
							onClick={() => setPage((p) => p + 1)}
						>
							<ChevronRight className="size-4" />
						</Button>
					</div>
				)}
			</div>

			<PODetailSheet
				open={!!openPoId}
				onOpenChange={(o) => !o && setOpenPoId(null)}
				poId={openPoId}
				onDeleted={() => setOpenPoId(null)}
			/>
		</div>
	);
}
