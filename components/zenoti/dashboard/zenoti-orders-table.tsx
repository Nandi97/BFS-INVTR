'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
	RefreshCw,
	Package,
	CheckCircle2,
	Clock,
	AlertCircle,
	Loader2,
	MoreHorizontal,
	Download,
	Mail,
	Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import {
	useZenotiOrders,
	useSyncZenoti,
	useSendPackingListEmail,
	useSendOrderNotification,
} from '@/hooks/use-zenoti';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { SupplierType } from '@/lib/zenoti-email';

function getSupplierType(order: any): SupplierType {
	const raw: string =
		order.supplier ?? order.notes?.replace(/^From:\s*/i, '') ?? '';
	const s = raw.toLowerCase();
	if (s.includes('beauty logix')) return 'WAREHOUSE';
	if (s.includes('costco')) return 'COSTCO';
	if (s.includes('inverness')) return 'INVERNESS';
	return 'OTHER';
}

const SUPPLIER_BADGE: Record<SupplierType, { label: string; cls: string }> = {
	WAREHOUSE: {
		label: 'Warehouse',
		cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
	},
	COSTCO: {
		label: 'Costco',
		cls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
	},
	INVERNESS: {
		label: 'Inverness',
		cls: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
	},
	OTHER: {
		label: 'External',
		cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
	},
};

const STATUS_CONFIG: Record<
	string,
	{
		label: string;
		variant: 'outline' | 'secondary' | 'default' | 'destructive';
	}
> = {
	PENDING: { label: 'Pending', variant: 'secondary' },
	IN_PROGRESS: { label: 'In Progress', variant: 'default' },
	SUBMITTED: { label: 'Submitted', variant: 'outline' },
	INVOICED: { label: 'Invoiced', variant: 'outline' },
};

const ZENOTI_STATUS_CONFIG: Record<string, { label: string; colour: string }> =
	{
		RAISED: {
			label: 'Raised',
			colour: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
		},
		UPDATED: {
			label: 'Updated',
			colour: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
		},
	};

function FulfillmentIcon({ status }: { status?: string }) {
	if (!status || status === 'PENDING')
		return <Clock className="text-muted-foreground size-4" />;
	if (status === 'IN_PROGRESS')
		return <Package className="text-primary size-4" />;
	if (status === 'SUBMITTED')
		return <CheckCircle2 className="size-4 text-emerald-600" />;
	if (status === 'INVOICED')
		return <CheckCircle2 className="text-muted-foreground size-4" />;
	return null;
}

const TYPE_FILTERS: Array<{ value: SupplierType | 'ALL'; label: string }> = [
	{ value: 'ALL', label: 'All' },
	{ value: 'WAREHOUSE', label: 'Warehouse' },
	{ value: 'COSTCO', label: 'Costco' },
	{ value: 'INVERNESS', label: 'Inverness' },
];

export function ZenotiOrdersTable() {
	const router = useRouter();
	const { data: rawOrders, isLoading, isError } = useZenotiOrders();
	const orders: any[] = Array.isArray(rawOrders) ? rawOrders : [];
	const sync = useSyncZenoti();
	const sendPackingList = useSendPackingListEmail();
	const sendNotification = useSendOrderNotification();
	const [typeFilter, setTypeFilter] = useState<SupplierType | 'ALL'>('ALL');

	async function handleSync() {
		const result = await sync.mutateAsync();
		toast.success(
			`Sync complete — ${result.totalNew} new, ${result.totalUpdated} updated`
		);
	}

	const filtered =
		typeFilter === 'ALL'
			? orders
			: orders.filter((o) => getSupplierType(o) === typeFilter);

	const pending = orders.filter(
		(o) => !o.fulfillment || o.fulfillment.status === 'PENDING'
	);
	const inProgress = orders.filter(
		(o) => o.fulfillment?.status === 'IN_PROGRESS'
	);
	const submitted = orders.filter((o) =>
		['SUBMITTED', 'INVOICED'].includes(o.fulfillment?.status)
	);

	return (
		<div className="space-y-6">
			{/* Summary cards */}
			<div className="grid gap-4 sm:grid-cols-3">
				<StatCard
					label="Awaiting Packing"
					count={pending.length}
					icon={<AlertCircle className="size-5 text-amber-500" />}
				/>
				<StatCard
					label="In Progress"
					count={inProgress.length}
					icon={<Package className="text-primary size-5" />}
				/>
				<StatCard
					label="Submitted"
					count={submitted.length}
					icon={<CheckCircle2 className="size-5 text-emerald-500" />}
				/>
			</div>

			{/* Table */}
			<Card>
				<CardHeader className="gap-3">
					<div className="flex flex-row items-center justify-between">
						<CardTitle>Zenoti Procurement Orders</CardTitle>
						<Button
							variant="outline"
							size="sm"
							onClick={handleSync}
							disabled={sync.isPending}
							className="gap-1.5"
						>
							{sync.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<RefreshCw className="size-4" />
							)}
							Sync from Zenoti
						</Button>
					</div>
					{/* Type filter chips */}
					<div className="flex flex-wrap gap-1.5">
						{TYPE_FILTERS.map((f) => (
							<button
								key={f.value}
								onClick={() => setTypeFilter(f.value)}
								className={cn(
									'rounded-full px-3 py-1 text-xs font-medium transition-colors',
									typeFilter === f.value
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground hover:bg-muted/80'
								)}
							>
								{f.label}
								{f.value !== 'ALL' && (
									<span className="ml-1 opacity-70">
										(
										{
											orders.filter(
												(o) =>
													getSupplierType(o) ===
													f.value
											).length
										}
										)
									</span>
								)}
							</button>
						))}
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{isLoading ? (
						<div className="text-muted-foreground flex h-40 items-center justify-center gap-2 text-sm">
							<Loader2 className="size-4 animate-spin" /> Loading
							orders…
						</div>
					) : isError ? (
						<div className="text-destructive flex h-40 items-center justify-center gap-2 text-sm">
							<AlertCircle className="size-4" /> Failed to load
							orders — check your session and try refreshing.
						</div>
					) : orders.length === 0 ? (
						<EmptyState
							icon={Package}
							title="No open procurement orders"
							description="Sync from Zenoti to pull RAISED or UPDATED orders, or all stores are fully fulfilled."
						/>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Order #</TableHead>
									<TableHead>Store</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Fulfillment</TableHead>
									<TableHead>Items</TableHead>
									<TableHead>Raised</TableHead>
									<TableHead>Deliver by</TableHead>
									<TableHead className="w-10" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((order: any) => {
									const fs = order.fulfillment?.status;
									const isSubmittedOrInvoiced = [
										'SUBMITTED',
										'INVOICED',
									].includes(fs);
									const supplierType = getSupplierType(order);
									const sBadge = SUPPLIER_BADGE[supplierType];
									return (
										<TableRow
											key={order.id}
											className={cn(
												'hover:bg-muted/50 cursor-pointer transition-colors',
												isSubmittedOrInvoiced &&
													'opacity-60'
											)}
											onClick={() =>
												router.push(
													`/zenoti/${order.id}`
												)
											}
										>
											<TableCell className="font-mono font-semibold">
												#{order.orderNumber}
											</TableCell>
											<TableCell className="font-medium">
												{order.centerName}
											</TableCell>
											<TableCell>
												<span
													className={cn(
														'rounded-full px-2 py-0.5 text-xs font-medium',
														sBadge.cls
													)}
												>
													{sBadge.label}
												</span>
											</TableCell>
											<TableCell>
												<span
													className={cn(
														'rounded-full px-2 py-0.5 text-xs font-medium',
														ZENOTI_STATUS_CONFIG[
															order.zenotiStatus
														]?.colour ??
															'text-muted-foreground'
													)}
												>
													{ZENOTI_STATUS_CONFIG[
														order.zenotiStatus
													]?.label ??
														order.zenotiStatus}
												</span>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1.5">
													<FulfillmentIcon
														status={fs}
													/>
													{fs ? (
														<Badge
															variant={
																STATUS_CONFIG[
																	fs
																]?.variant ??
																'secondary'
															}
															className="text-xs"
														>
															{STATUS_CONFIG[fs]
																?.label ?? fs}
														</Badge>
													) : (
														<span className="text-muted-foreground text-xs">
															—
														</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{order.items.length}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{order.raisedAt
													? formatDistanceToNow(
															new Date(
																order.raisedAt
															),
															{ addSuffix: true }
														)
													: '—'}
											</TableCell>
											<TableCell
												className={cn(
													'text-sm',
													order.deliverBy &&
														new Date(
															order.deliverBy
														) < new Date()
														? 'text-destructive font-medium'
														: 'text-muted-foreground'
												)}
											>
												{order.deliverBy
													? new Date(
															order.deliverBy
														).toLocaleDateString(
															'en-CA'
														)
													: '—'}
											</TableCell>
											<TableCell
												onClick={(e) =>
													e.stopPropagation()
												}
											>
												<DropdownMenu>
													<DropdownMenuTrigger
														asChild
													>
														<Button
															variant="ghost"
															size="icon"
															className="size-8"
														>
															<MoreHorizontal className="size-4" />
															<span className="sr-only">
																Order actions
															</span>
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															className="gap-2"
															onClick={() =>
																sendNotification
																	.mutateAsync(
																		order.id
																	)
																	.then(() =>
																		toast.success(
																			'Notification sent'
																		)
																	)
															}
														>
															<Bell className="size-4" />
															Send Notification
														</DropdownMenuItem>
														{order.fulfillment
															?.id && (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	asChild
																>
																	<a
																		href={`/api/zenoti/fulfillments/${order.fulfillment.id}/packing-slip`}
																		download
																		className="flex cursor-pointer items-center gap-2"
																	>
																		<Download className="size-4" />
																		Download
																		Packing
																		Slip
																	</a>
																</DropdownMenuItem>
																<DropdownMenuItem
																	className="gap-2"
																	onClick={() =>
																		sendPackingList
																			.mutateAsync(
																				{
																					fulfillmentId:
																						order
																							.fulfillment
																							.id,
																					orderId:
																						order.id,
																				}
																			)
																			.then(
																				() =>
																					toast.success(
																						'Packing list emailed'
																					)
																			)
																	}
																>
																	<Mail className="size-4" />
																	Send Packing
																	List Email
																</DropdownMenuItem>
															</>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function StatCard({
	label,
	count,
	icon,
}: {
	label: string;
	count: number;
	icon: React.ReactNode;
}) {
	return (
		<Card>
			<CardContent className="pt-4 pb-4">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-muted-foreground text-sm">{label}</p>
						<p className="text-2xl font-bold">{count}</p>
					</div>
					{icon}
				</div>
			</CardContent>
		</Card>
	);
}
