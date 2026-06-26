'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
	RefreshCw,
	UploadCloud,
	ChevronLeft,
	ChevronRight,
	CheckCircle2,
	Circle,
} from 'lucide-react';
import { toast } from 'sonner';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
	useShopifyOrders,
	useSyncShopifyOrders,
	useSyncShopifyInventory,
	type ShopifyOrder,
} from '@/hooks/use-shopify';

const FINANCIAL_COLORS: Record<string, string> = {
	paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
	pending:
		'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
	refunded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
	voided: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
	partially_paid:
		'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const FULFILLMENT_COLORS: Record<string, string> = {
	fulfilled:
		'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
	partial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
	unfulfilled:
		'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function storeName(domain: string) {
	return domain.replace('.myshopify.com', '');
}

function ShopifyRow({ order }: { order: ShopifyOrder }) {
	const router = useRouter();

	return (
		<TableRow
			className="cursor-pointer"
			onClick={() => router.push(`/shopify/${order.id}`)}
		>
			<TableCell>
				{order.isAcknowledged ? (
					<CheckCircle2 className="size-4 text-emerald-500" />
				) : (
					<Circle className="size-4 text-amber-500" />
				)}
			</TableCell>
			<TableCell className="font-medium">{order.orderNumber}</TableCell>
			<TableCell className="text-muted-foreground text-sm">
				{storeName(order.storeDomain)}
			</TableCell>
			<TableCell className="text-sm">
				{order.customerName ?? '—'}
				{order.customerEmail && (
					<div className="text-muted-foreground text-xs">
						{order.customerEmail}
					</div>
				)}
			</TableCell>
			<TableCell className="text-muted-foreground text-sm">
				{order.items.length} item{order.items.length !== 1 ? 's' : ''}
			</TableCell>
			<TableCell className="font-mono text-sm font-medium">
				{order.currency}{' '}
				{order.totalPrice != null
					? `$${order.totalPrice.toFixed(2)}`
					: '—'}
			</TableCell>
			<TableCell>
				{order.financialStatus && (
					<Badge
						variant="secondary"
						className={cn(
							'text-xs capitalize',
							FINANCIAL_COLORS[order.financialStatus] ?? ''
						)}
					>
						{order.financialStatus.replace(/_/g, ' ')}
					</Badge>
				)}
			</TableCell>
			<TableCell>
				<Badge
					variant="secondary"
					className={cn(
						'text-xs capitalize',
						order.fulfillmentStatus
							? (FULFILLMENT_COLORS[order.fulfillmentStatus] ??
									'')
							: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
					)}
				>
					{order.fulfillmentStatus?.replace(/_/g, ' ') ??
						'unfulfilled'}
				</Badge>
			</TableCell>
			<TableCell className="text-muted-foreground text-sm whitespace-nowrap">
				{format(new Date(order.createdAtShopify), 'MMM d, yyyy')}
			</TableCell>
		</TableRow>
	);
}

export function ShopifyOrdersTable() {
	const [store, setStore] = useState('all');
	const [acknowledged, setAcknowledged] = useState<'all' | 'false' | 'true'>(
		'all'
	);
	const [fulfillment, setFulfillment] = useState('all');
	const [page, setPage] = useState(1);
	const limit = 30;

	const syncOrders = useSyncShopifyOrders();
	const syncInventory = useSyncShopifyInventory();

	const { data, isLoading } = useShopifyOrders({
		store: store === 'all' ? undefined : store,
		acknowledged:
			acknowledged === 'all' ? undefined : acknowledged === 'true',
		fulfillmentStatus: fulfillment === 'all' ? undefined : fulfillment,
		page,
		limit,
	});

	const rows = data?.data ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	async function handleSyncOrders() {
		try {
			const result = await syncOrders.mutateAsync();
			const stores = result.stores as Record<
				string,
				{
					created: number;
					updated: number;
					error?: string;
					staleErrors?: string[];
				}
			>;
			for (const [domain, r] of Object.entries(stores)) {
				const label = storeName(domain);
				if (r.error) {
					toast.error(`${label}: ${r.error}`);
				} else if (r.staleErrors?.length) {
					toast.warning(
						`${label}: ${r.created} new, ${r.updated} updated — status update error: ${r.staleErrors[0]}`
					);
				} else {
					toast.success(
						`${label}: ${r.created} new, ${r.updated} updated`
					);
				}
			}
		} catch {
			toast.error('Order sync failed');
		}
	}

	async function handleSyncInventory() {
		try {
			const result = await syncInventory.mutateAsync();
			const stores = result.stores as Record<
				string,
				{
					synced: number;
					skipped: number;
					errors: string[];
					error?: string;
				}
			>;
			for (const [domain, r] of Object.entries(stores)) {
				const label = storeName(domain);
				if (r.error) {
					toast.error(`${label}: ${r.error}`);
				} else if (r.errors?.length) {
					toast.error(
						`${label}: ${r.synced} updated, ${r.errors.length} failed — ${r.errors[0]}`
					);
				} else {
					toast.success(
						`${label}: ${r.synced} updated, ${r.skipped} skipped`
					);
				}
			}
		} catch {
			toast.error('Inventory sync failed');
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Shopify Orders
					</h1>
					<p className="text-muted-foreground mt-0.5 text-sm">
						Orders across all connected Shopify stores.
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleSyncInventory}
						disabled={syncInventory.isPending}
					>
						<UploadCloud className="mr-1.5 size-3.5" />
						{syncInventory.isPending ? 'Pushing…' : 'Push Stock'}
					</Button>
					<Button
						size="sm"
						onClick={handleSyncOrders}
						disabled={syncOrders.isPending}
					>
						<RefreshCw
							className={cn(
								'mr-1.5 size-3.5',
								syncOrders.isPending && 'animate-spin'
							)}
						/>
						{syncOrders.isPending ? 'Syncing…' : 'Sync Orders'}
					</Button>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-2">
				<Select
					value={store}
					onValueChange={(v) => {
						setStore(v);
						setPage(1);
					}}
				>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="All stores" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All stores</SelectItem>
						{/* Stores listed from env — resolved server-side; for now show any unique domain seen in data */}
						{[
							...new Set(
								(data?.data ?? []).map((o) => o.storeDomain)
							),
						].map((d) => (
							<SelectItem key={d} value={d}>
								{storeName(d)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={acknowledged}
					onValueChange={(v) => {
						setAcknowledged(v as typeof acknowledged);
						setPage(1);
					}}
				>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All orders</SelectItem>
						<SelectItem value="false">Unacknowledged</SelectItem>
						<SelectItem value="true">Acknowledged</SelectItem>
					</SelectContent>
				</Select>

				<Select
					value={fulfillment}
					onValueChange={(v) => {
						setFulfillment(v);
						setPage(1);
					}}
				>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All fulfillments</SelectItem>
						<SelectItem value="unfulfilled">Unfulfilled</SelectItem>
						<SelectItem value="partial">Partial</SelectItem>
						<SelectItem value="fulfilled">Fulfilled</SelectItem>
					</SelectContent>
				</Select>

				{total > 0 && (
					<p className="text-muted-foreground ml-auto text-xs">
						{total} order{total !== 1 ? 's' : ''}
					</p>
				)}
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-8" />
							<TableHead>Order</TableHead>
							<TableHead>Store</TableHead>
							<TableHead>Customer</TableHead>
							<TableHead>Items</TableHead>
							<TableHead>Total</TableHead>
							<TableHead>Payment</TableHead>
							<TableHead>Fulfillment</TableHead>
							<TableHead>Date</TableHead>
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
										icon={CheckCircle2}
										title="No open orders"
										description="Click Sync Orders to pull the latest from Shopify."
									/>
								</TableCell>
							</TableRow>
						) : (
							rows.map((order) => (
								<ShopifyRow key={order.id} order={order} />
							))
						)}
					</TableBody>
				</Table>
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-muted-foreground text-xs">
						Page {page} of {totalPages} · {total} orders
					</p>
					<div className="flex gap-1">
						<Button
							variant="outline"
							size="icon"
							className="size-7"
							disabled={page <= 1}
							onClick={() => setPage((p) => p - 1)}
						>
							<ChevronLeft className="size-4" />
						</Button>
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
				</div>
			)}
		</div>
	);
}
