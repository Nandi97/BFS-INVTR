'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
	ArrowLeft,
	CheckCircle2,
	MapPin,
	Package,
	Loader2,
	Minus,
	Plus,
	AlertTriangle,
	Download,
	Mail,
	Bell,
	ChevronDown,
	CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
	useShopifyOrder,
	useAcknowledgeShopifyOrder,
	useCreateShopifyFulfillment,
	useUpdateShopifyFulfillmentItem,
	useSubmitShopifyFulfillment,
	useSendShopifyPackingListEmail,
	useNotifyShopifyNonWarehoused,
	type ShopifyFulfillmentItem,
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
	const createFulfillment = useCreateShopifyFulfillment();
	const updateItem = useUpdateShopifyFulfillmentItem();
	const submitFulfillment = useSubmitShopifyFulfillment();
	const sendPackingList = useSendShopifyPackingListEmail();
	const notifyNonWarehoused = useNotifyShopifyNonWarehoused();
	const backfillTriggered = useRef(false);

	// Order was fulfilled directly in Shopify without ever going through BFS
	// packing (e.g. fulfilled before this feature existed, or by someone
	// bypassing BFS) — backfill a fully-packed, submitted record so the
	// Actions menu (download/email packing slip) works retroactively instead
	// of dead-ending on a "Start Packing" button for something already gone.
	useEffect(() => {
		if (
			order &&
			!order.fulfillment &&
			order.fulfillmentStatus === 'fulfilled' &&
			!backfillTriggered.current
		) {
			backfillTriggered.current = true;
			createFulfillment.mutate(order.id, {
				onError: () => {
					backfillTriggered.current = false;
				},
			});
		}
	}, [order, createFulfillment]);

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

	const f = order.fulfillment;
	const isSubmitted = f?.status === 'SUBMITTED' || f?.status === 'INVOICED';
	const shopifyFulfilled = order.fulfillmentStatus === 'fulfilled';
	const nonWarehousedCount =
		f?.items.filter((i) => i.isNonWarehoused).length ?? 0;

	const packedCount = f?.items.filter((i) => i.isPacked).length ?? 0;
	const totalItems = f?.items.length ?? order.items.length;
	const progress =
		totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

	const shippingLines = [
		order.shippingName,
		order.shippingAddress1,
		[order.shippingCity, order.shippingProvince, order.shippingZip]
			.filter(Boolean)
			.join(', '),
		order.shippingCountry,
	].filter(Boolean);

	const lineTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);

	async function startPacking() {
		await createFulfillment.mutateAsync(id);
		toast.success('Fulfillment started — items pre-loaded from the order');
	}

	async function handleUpdate(
		item: ShopifyFulfillmentItem,
		patch: { fulfilledQty?: number; isPacked?: boolean; notes?: string }
	) {
		if (!f || isSubmitted) return;
		await updateItem.mutateAsync({
			fulfillmentId: f.id,
			itemId: item.id,
			orderId: id,
			...patch,
		});
	}

	async function handleMarkComplete() {
		if (!f) return;
		const unpacked = f.items.filter((i) => !i.isPacked);
		if (unpacked.length > 0) {
			const ok = confirm(
				`${unpacked.length} item(s) not checked. Mark complete anyway?`
			);
			if (!ok) return;
		}
		const result = await submitFulfillment.mutateAsync({
			fulfillmentId: f.id,
			orderId: id,
		});
		if (result.ok) toast.success('Order marked complete');
	}

	async function handleSendPackingList() {
		if (!f) return;
		await sendPackingList.mutateAsync(f.id);
		toast.success('Packing list emailed');
	}

	async function handleNotifyNonWarehoused() {
		if (!f) return;
		try {
			await notifyNonWarehoused.mutateAsync(f.id);
			toast.success('Notification sent');
		} catch {
			toast.error('Failed to send notification');
		}
	}

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

				<div className="flex flex-wrap items-center gap-2">
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
							variant="outline"
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

					{!f && !shopifyFulfilled && (
						<Button
							onClick={startPacking}
							disabled={createFulfillment.isPending}
							className="gap-1.5"
						>
							{createFulfillment.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Package className="size-4" />
							)}
							Start Packing
						</Button>
					)}
					{f && !isSubmitted && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button
									className="gap-1.5"
									disabled={submitFulfillment.isPending}
								>
									{submitFulfillment.isPending ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<CheckCheck className="size-4" />
									)}
									Mark Complete
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Mark order complete?
									</AlertDialogTitle>
									<AlertDialogDescription>
										This will lock the fulfillment — no
										further edits. Use the Actions menu to
										download or email the packing slip.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										onClick={handleMarkComplete}
									>
										Mark complete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
					{isSubmitted && (
						<Badge className="gap-1.5 bg-emerald-600 px-3 py-1.5 text-sm text-white">
							<CheckCircle2 className="size-4" /> Completed
						</Badge>
					)}
					{f && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="gap-1.5">
									Actions <ChevronDown className="size-3.5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem asChild>
									<a
										href={`/api/shopify/fulfillments/${f.id}/packing-slip`}
										download
										className="flex cursor-pointer items-center gap-2"
									>
										<Download className="size-4" />
										Download Packing Slip
									</a>
								</DropdownMenuItem>
								<DropdownMenuItem
									className="gap-2"
									disabled={sendPackingList.isPending}
									onClick={handleSendPackingList}
								>
									{sendPackingList.isPending ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Mail className="size-4" />
									)}
									Send Packing List Email
								</DropdownMenuItem>
								{nonWarehousedCount > 0 && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="gap-2"
											disabled={
												notifyNonWarehoused.isPending
											}
											onClick={handleNotifyNonWarehoused}
										>
											{notifyNonWarehoused.isPending ? (
												<Loader2 className="size-4 animate-spin" />
											) : (
												<Bell className="size-4" />
											)}
											Send Non-Warehoused Notification
										</DropdownMenuItem>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>

			{/* Meta cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
					{!!order.totalDiscounts && (
						<p className="text-muted-foreground text-xs">
							Includes {order.currency} $
							{order.totalDiscounts.toFixed(2)} discount
							{order.discountCodes
								? ` (${order.discountCodes})`
								: ''}
						</p>
					)}
					{order.note && (
						<p className="text-muted-foreground mt-2 border-t pt-2 text-xs">
							{order.note}
						</p>
					)}
				</div>
			</div>

			{/* Progress bar */}
			{f && (
				<Card>
					<CardContent className="py-4">
						<div className="mb-2 flex items-center justify-between text-sm">
							<span className="font-medium">
								{packedCount} / {totalItems} items packed
							</span>
							<span
								className={cn(
									'font-semibold',
									progress === 100
										? 'text-emerald-600'
										: 'text-muted-foreground'
								)}
							>
								{progress}%
							</span>
						</div>
						<Progress value={progress} className="h-2" />
					</CardContent>
				</Card>
			)}

			{/* Items */}
			{!f ? (
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
									const bfsQty =
										item.bfsMatch?.quantity ?? null;
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
			) : (
				<div className="space-y-3">
					<p className="text-muted-foreground px-1 text-sm">
						{f.items.length} item{f.items.length !== 1 ? 's' : ''}
						{nonWarehousedCount > 0 &&
							` · ${nonWarehousedCount} not stocked in-house`}
					</p>
					{f.items.map((item) => (
						<PackingCard
							key={item.id}
							item={item}
							isSubmitted={isSubmitted}
							onUpdate={(patch) => handleUpdate(item, patch)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Packing card ──────────────────────────────────────────────────────────────

function PackingCard({
	item,
	isSubmitted,
	onUpdate,
}: {
	item: ShopifyFulfillmentItem;
	isSubmitted: boolean;
	onUpdate: (patch: {
		fulfilledQty?: number;
		isPacked?: boolean;
		notes?: string;
	}) => Promise<void>;
}) {
	const [qtyVal, setQtyVal] = useState<number>(item.fulfilledQty ?? 0);
	const [notesVal, setNotesVal] = useState<string>(item.notes ?? '');
	const [saving, setSaving] = useState(false);
	const notesTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	);

	useEffect(() => {
		setQtyVal(item.fulfilledQty ?? 0);
		setNotesVal(item.notes ?? '');
	}, [item.id, item.fulfilledQty, item.notes]);

	const short = qtyVal < item.requestedQty && item.requestedQty > 0;
	const stockLow =
		item.stockOnHand != null && item.stockOnHand < item.requestedQty;

	async function saveQty(val: number) {
		if (isSubmitted) return;
		setSaving(true);
		try {
			await onUpdate({ fulfilledQty: val });
		} finally {
			setSaving(false);
		}
	}

	function handleNotesChange(value: string) {
		setNotesVal(value);
		clearTimeout(notesTimer.current);
		notesTimer.current = setTimeout(() => {
			if (!isSubmitted) onUpdate({ notes: value });
		}, 700);
	}

	async function togglePacked() {
		if (isSubmitted) return;
		setSaving(true);
		try {
			await onUpdate({ isPacked: !item.isPacked });
		} finally {
			setSaving(false);
		}
	}

	function step(delta: number) {
		const next = Math.max(0, qtyVal + delta);
		setQtyVal(next);
		saveQty(next);
	}

	const dividerCls = item.isPacked
		? 'border-emerald-200 dark:border-emerald-800'
		: 'border-border';

	return (
		<div
			className={cn(
				'rounded-xl border-2 transition-all duration-200',
				item.isPacked
					? 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/20'
					: item.isNonWarehoused
						? 'border-violet-300 bg-violet-50/40 dark:border-violet-700 dark:bg-violet-950/10'
						: short
							? 'border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/10'
							: 'border-border bg-card'
			)}
		>
			<div className="flex items-start gap-4 p-5">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<p
							className={cn(
								'text-base leading-snug font-semibold',
								item.isPacked &&
									'text-muted-foreground line-through'
							)}
						>
							{item.title}
						</p>
						{item.variantTitle && (
							<span className="text-muted-foreground text-xs">
								{item.variantTitle}
							</span>
						)}
						{item.isNonWarehoused && (
							<span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
								Not in-house
							</span>
						)}
					</div>
					{item.sku && (
						<p className="text-muted-foreground mt-0.5 font-mono text-xs">
							{item.sku}
						</p>
					)}
					{item.stockOnHand != null && (
						<p
							className={cn(
								'mt-1 text-xs font-medium',
								stockLow
									? 'text-amber-600 dark:text-amber-400'
									: 'text-muted-foreground'
							)}
						>
							{stockLow && (
								<AlertTriangle className="mr-1 inline size-3" />
							)}
							{item.stockOnHand} in warehouse
						</p>
					)}
				</div>

				<button
					type="button"
					disabled={isSubmitted || saving}
					onClick={togglePacked}
					className={cn(
						'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border-2 transition-all active:scale-95',
						item.isPacked
							? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
							: 'border-muted-foreground/30 bg-background hover:border-primary hover:bg-primary/5',
						(isSubmitted || saving) &&
							'cursor-not-allowed opacity-50'
					)}
					aria-label={
						item.isPacked ? 'Unmark packed' : 'Mark as packed'
					}
				>
					{saving ? (
						<Loader2 className="size-5 animate-spin" />
					) : item.isPacked ? (
						<CheckCircle2 className="size-6" />
					) : null}
				</button>
			</div>

			<div
				className={cn(
					'flex flex-wrap items-end gap-6 border-t px-5 py-4',
					dividerCls
				)}
			>
				<div className="flex flex-col gap-1.5">
					<div className="flex items-baseline gap-1.5">
						<span className="text-sm font-medium">Qty</span>
						<span className="text-muted-foreground text-xs">
							req: {item.requestedQty}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							disabled={isSubmitted || qtyVal <= 0}
							onClick={() => step(-1)}
							className="bg-background hover:bg-muted flex h-10 w-10 items-center justify-center rounded-lg border transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Decrease qty"
						>
							<Minus className="size-4" />
						</button>
						<Input
							type="number"
							min={0}
							value={qtyVal === 0 ? '' : qtyVal}
							disabled={isSubmitted}
							placeholder="0"
							onChange={(e) => {
								const v = e.target.valueAsNumber;
								setQtyVal(isNaN(v) ? 0 : v);
							}}
							onBlur={(e) => {
								const v = e.target.valueAsNumber;
								saveQty(isNaN(v) ? 0 : v);
							}}
							className={cn(
								'h-10 w-16 text-center text-lg font-bold',
								item.requestedQty > 0 &&
									qtyVal === 0 &&
									'border-destructive text-destructive',
								short &&
									qtyVal !== 0 &&
									'border-amber-400 text-amber-600'
							)}
						/>
						<button
							type="button"
							disabled={isSubmitted}
							onClick={() => step(1)}
							className="bg-background hover:bg-muted flex h-10 w-10 items-center justify-center rounded-lg border transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
							aria-label="Increase qty"
						>
							<Plus className="size-4" />
						</button>
					</div>
				</div>

				{item.unitPrice != null && (
					<div className="text-sm">
						<p className="text-muted-foreground text-xs">
							Unit price
						</p>
						<p className="font-mono font-semibold">
							${item.unitPrice.toFixed(2)}
						</p>
					</div>
				)}
			</div>

			{!isSubmitted ? (
				<div className={cn('border-t px-5 pt-3 pb-4', dividerCls)}>
					<Textarea
						placeholder="Comment, shortage reason, substitution note…"
						value={notesVal}
						onChange={(e) => handleNotesChange(e.target.value)}
						rows={notesVal ? 2 : 1}
						className="resize-none text-sm"
					/>
				</div>
			) : notesVal ? (
				<div className={cn('border-t px-5 pt-3 pb-4', dividerCls)}>
					<p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
						Note
					</p>
					<p className="text-sm">{notesVal}</p>
				</div>
			) : null}
		</div>
	);
}
