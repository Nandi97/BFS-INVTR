'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, MapPin, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
	useShopifyOrder,
	useAcknowledgeShopifyOrder,
} from '@/hooks/use-shopify';

const FINANCIAL_COLORS: Record<string, string> = {
	paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
	pending:
		'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
	refunded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
	voided: 'bg-slate-100 text-slate-600',
	partially_paid:
		'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function storeName(domain: string) {
	return domain.replace('.myshopify.com', '');
}

export function ShopifyOrderView({ id }: { id: string }) {
	const router = useRouter();
	const { data: order, isLoading } = useShopifyOrder(id);
	const acknowledge = useAcknowledgeShopifyOrder();

	async function handleAcknowledge() {
		try {
			await acknowledge.mutateAsync(id);
			toast.success('Order marked as acknowledged');
		} catch {
			toast.error('Failed to acknowledge order');
		}
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-48" />
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
				<Skeleton className="h-64 rounded-lg" />
			</div>
		);
	}

	if (!order) {
		return (
			<div className="text-muted-foreground py-12 text-center text-sm">
				Order not found.
			</div>
		);
	}

	const shippingLines = [
		order.shippingName,
		order.shippingAddress1,
		[order.shippingCity, order.shippingProvince, order.shippingZip]
			.filter(Boolean)
			.join(', '),
		order.shippingCountry,
	].filter(Boolean);

	const lineTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<Button
						variant="ghost"
						size="sm"
						className="mb-2 -ml-2"
						onClick={() => router.back()}
					>
						<ArrowLeft className="mr-1.5 size-3.5" />
						Back
					</Button>
					<h1 className="text-2xl font-semibold tracking-tight">
						{order.orderNumber}
					</h1>
					<p className="text-muted-foreground mt-0.5 text-sm">
						{storeName(order.storeDomain)} &middot;{' '}
						{format(
							new Date(order.createdAtShopify),
							'MMMM d, yyyy · h:mm a'
						)}
					</p>
				</div>

				<div className="flex items-center gap-2">
					{order.financialStatus && (
						<Badge
							variant="secondary"
							className={cn(
								'capitalize',
								FINANCIAL_COLORS[order.financialStatus] ?? ''
							)}
						>
							{order.financialStatus.replace(/_/g, ' ')}
						</Badge>
					)}
					{!order.isAcknowledged ? (
						<Button
							size="sm"
							onClick={handleAcknowledge}
							disabled={acknowledge.isPending}
						>
							<CheckCircle2 className="mr-1.5 size-3.5" />
							{acknowledge.isPending ? 'Saving…' : 'Acknowledge'}
						</Button>
					) : (
						<Badge
							variant="secondary"
							className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
						>
							<CheckCircle2 className="mr-1 size-3" />
							Acknowledged
						</Badge>
					)}
				</div>
			</div>

			{/* Meta cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{/* Customer */}
				<div className="space-y-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Customer
					</p>
					<p className="font-medium">{order.customerName ?? '—'}</p>
					{order.customerEmail && (
						<p className="text-muted-foreground text-sm">
							{order.customerEmail}
						</p>
					)}
				</div>

				{/* Shipping */}
				<div className="space-y-1 rounded-lg border p-4">
					<p className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
						<MapPin className="size-3" /> Ship To
					</p>
					{shippingLines.length > 0 ? (
						shippingLines.map((line, i) => (
							<p
								key={i}
								className={cn(
									'text-sm',
									i === 0
										? 'font-medium'
										: 'text-muted-foreground'
								)}
							>
								{line}
							</p>
						))
					) : (
						<p className="text-muted-foreground text-sm">
							No shipping address
						</p>
					)}
				</div>

				{/* Order total */}
				<div className="space-y-1 rounded-lg border p-4">
					<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Order Total
					</p>
					<p className="font-mono text-2xl font-semibold">
						{order.currency}{' '}
						{order.totalPrice != null
							? `$${order.totalPrice.toFixed(2)}`
							: `$${lineTotal.toFixed(2)}`}
					</p>
					{order.note && (
						<p className="text-muted-foreground mt-2 border-t pt-2 text-xs">
							{order.note}
						</p>
					)}
				</div>
			</div>

			{/* Line items */}
			<div>
				<h2 className="mb-3 text-sm font-medium">
					Line Items ({order.items.length})
				</h2>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Product</TableHead>
								<TableHead>SKU</TableHead>
								<TableHead className="text-right">
									Qty
								</TableHead>
								<TableHead className="text-right">
									Unit Price
								</TableHead>
								<TableHead className="text-right">
									Total
								</TableHead>
								<TableHead className="text-right">
									BFS Stock
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{order.items.map((item) => {
								const bfsQty = item.bfsMatch?.quantity ?? null;
								const stockColour =
									bfsQty === null
										? 'text-muted-foreground'
										: bfsQty < item.quantity
											? 'text-red-600 dark:text-red-400'
											: 'text-emerald-600 dark:text-emerald-400';

								return (
									<TableRow key={item.id}>
										<TableCell>
											<p className="text-sm font-medium">
												{item.title}
											</p>
											{item.variantTitle && (
												<p className="text-muted-foreground text-xs">
													{item.variantTitle}
												</p>
											)}
										</TableCell>
										<TableCell className="text-muted-foreground font-mono text-sm">
											{item.sku ?? '—'}
										</TableCell>
										<TableCell className="text-right font-mono font-medium">
											{item.quantity}
										</TableCell>
										<TableCell className="text-right font-mono text-sm">
											${item.price.toFixed(2)}
										</TableCell>
										<TableCell className="text-right font-mono text-sm font-semibold">
											$
											{(
												item.price * item.quantity
											).toFixed(2)}
										</TableCell>
										<TableCell
											className={cn(
												'text-right font-mono text-sm font-semibold',
												stockColour
											)}
										>
											{bfsQty !== null ? (
												bfsQty
											) : (
												<span className="text-muted-foreground text-xs">
													{item.sku
														? 'no match'
														: 'no SKU'}
												</span>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
				<p className="text-muted-foreground mt-2 text-xs">
					<Package className="mr-1 inline size-3" />
					BFS Stock column shows current warehouse qty. Red =
					insufficient stock for this order.
				</p>
			</div>
		</div>
	);
}
