'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
	ArrowLeft,
	Package,
	CheckCircle2,
	Plus,
	Trash2,
	Loader2,
	AlertTriangle,
	AlertCircle,
	Minus,
	Download,
	Mail,
	Bell,
	ChevronDown,
	CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	useZenotiOrder,
	useCreateFulfillment,
	useUpdateFulfillmentItem,
	useAddWalkInItem,
	useDeleteWalkInItem,
	useSubmitFulfillment,
	useSendPackingListEmail,
	useSendOrderNotification,
} from '@/hooks/use-zenoti';

const ORG_LABEL: Record<string, string> = {
	bfs: 'Beauty First Spa',
	bl: 'Beauty Logix',
};

export function FulfillmentView({ orderId }: { orderId: string }) {
	const { data: order, isLoading } = useZenotiOrder(orderId);
	const createFulfillment = useCreateFulfillment();
	const updateItem = useUpdateFulfillmentItem();
	const addWalkIn = useAddWalkInItem();
	const deleteWalkIn = useDeleteWalkInItem();
	const submitFulfillment = useSubmitFulfillment();
	const sendPackingList = useSendPackingListEmail();
	const sendNotification = useSendOrderNotification();

	const [walkInOpen, setWalkInOpen] = useState(false);
	const [walkIn, setWalkIn] = useState({
		productCode: '',
		productName: '',
		fulfilledRetailQty: 0,
		fulfilledConsumableQty: 0,
	});

	if (isLoading) {
		return (
			<div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm">
				<Loader2 className="size-4 animate-spin" /> Loading order…
			</div>
		);
	}
	if (!order) {
		return (
			<div className="text-muted-foreground py-16 text-center">
				Order not found.{' '}
				<Link href="/zenoti" className="underline">
					Back to orders
				</Link>
			</div>
		);
	}

	const f = order.fulfillment;
	const isSubmitted = f?.status === 'SUBMITTED' || f?.status === 'INVOICED';

	const packedCount = f?.items.filter((i: any) => i.isPacked).length ?? 0;
	const totalItems = f?.items.length ?? order.items.length;
	const progress =
		totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

	async function startPacking() {
		await createFulfillment.mutateAsync(orderId);
		toast.success('Fulfillment started — items pre-loaded from Zenoti');
	}

	async function handleUpdate(
		item: any,
		patch: {
			fulfilledRetailQty?: number;
			fulfilledConsumableQty?: number;
			isPacked?: boolean;
			notes?: string;
		}
	) {
		if (isSubmitted) return;
		await updateItem.mutateAsync({
			fulfillmentId: f.id,
			itemId: item.id,
			orderId,
			...patch,
		});
	}

	async function handleAddWalkIn() {
		if (!walkIn.productName.trim()) return;
		await addWalkIn.mutateAsync({
			fulfillmentId: f.id,
			orderId,
			productCode: walkIn.productCode || undefined,
			productName: walkIn.productName,
			fulfilledRetailQty: walkIn.fulfilledRetailQty,
			fulfilledConsumableQty: walkIn.fulfilledConsumableQty,
		});
		setWalkIn({
			productCode: '',
			productName: '',
			fulfilledRetailQty: 0,
			fulfilledConsumableQty: 0,
		});
		setWalkInOpen(false);
		toast.success('Walk-in item added');
	}

	async function handleDeleteWalkIn(item: any) {
		await deleteWalkIn.mutateAsync({
			fulfillmentId: f.id,
			itemId: item.id,
			orderId,
		});
	}

	async function handleMarkComplete() {
		const unpacked = f.items.filter((i: any) => !i.isPacked);
		if (unpacked.length > 0) {
			const ok = confirm(
				`${unpacked.length} item(s) not checked. Mark complete anyway?`
			);
			if (!ok) return;
		}
		const result = await submitFulfillment.mutateAsync({
			fulfillmentId: f.id,
			orderId,
		});
		if (result.ok) {
			toast.success('Order marked complete');
		}
	}

	async function handleSendPackingList() {
		await sendPackingList.mutateAsync({
			fulfillmentId: f.id,
			orderId,
		});
		toast.success('Packing list emailed to accounting');
	}

	async function handleSendNotification() {
		await sendNotification.mutateAsync(orderId);
		toast.success('Notification sent');
	}

	return (
		<div className="mx-auto max-w-3xl space-y-5">
			{/* Header */}
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" asChild>
						<Link href="/zenoti">
							<ArrowLeft className="size-4" />
						</Link>
					</Button>
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-semibold">
								Order #{order.orderNumber}
							</h1>
							<Badge
								variant="outline"
								className={cn(
									'text-xs',
									order.zenotiStatus === 'UPDATED' &&
										'border-blue-400 text-blue-600',
									order.zenotiStatus === 'RAISED' &&
										'border-amber-400 text-amber-600'
								)}
							>
								{order.zenotiStatus}
							</Badge>
						</div>
						<p className="text-muted-foreground mt-0.5 text-sm">
							{order.centerName} ·{' '}
							{ORG_LABEL[order.org] ?? order.org}
							{order.supplier && (
								<span className="ml-2">· {order.supplier}</span>
							)}
							{order.deliverBy && (
								<span
									className={cn(
										'ml-2',
										new Date(order.deliverBy) < new Date()
											? 'text-destructive font-medium'
											: ''
									)}
								>
									· Deliver by{' '}
									{new Date(
										order.deliverBy
									).toLocaleDateString('en-CA')}
								</span>
							)}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{!f && (
						<Button
							onClick={startPacking}
							disabled={createFulfillment.isPending}
							size="lg"
							className="gap-2"
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
						<>
							<Button
								variant="outline"
								className="gap-1.5"
								onClick={() => setWalkInOpen(true)}
							>
								<Plus className="size-4" /> Add Walk-in Item
							</Button>
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
											further edits. Use the Actions menu
											to download or email the packing
											list.
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
						</>
					)}
					{isSubmitted && (
						<Badge className="gap-1.5 bg-emerald-600 px-3 py-1.5 text-sm text-white">
							<CheckCircle2 className="size-4" /> Completed
						</Badge>
					)}
					{/* Actions dropdown — always available once packing started */}
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
										href={`/api/zenoti/fulfillments/${f.id}/packing-slip`}
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
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="gap-2"
									disabled={sendNotification.isPending}
									onClick={handleSendNotification}
								>
									{sendNotification.isPending ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Bell className="size-4" />
									)}
									Send Order Notification
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
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

			{/* Pre-pack preview (no fulfillment yet) */}
			{!f ? (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<AlertCircle className="text-muted-foreground size-4" />
							{order.items.length} line items — press "Start
							Packing" to begin
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="divide-y">
							{order.items.map((item: any) => (
								<div
									key={item.id}
									className="flex items-center justify-between px-5 py-3.5"
								>
									<div>
										<p className="text-sm font-medium">
											{item.productName}
										</p>
										<p className="text-muted-foreground font-mono text-xs">
											{item.productCode}
										</p>
									</div>
									<div className="flex gap-5 text-right text-sm">
										{item.retailRaised > 0 && (
											<div>
												<p className="text-muted-foreground text-xs">
													Retail
												</p>
												<p className="font-bold">
													{item.retailRaised}
												</p>
											</div>
										)}
										{item.consumableRaised > 0 && (
											<div>
												<p className="text-muted-foreground text-xs">
													Consumable
												</p>
												<p className="font-bold">
													{item.consumableRaised}
												</p>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			) : (
				/* ── Active packing cards ── */
				<div className="space-y-3">
					<p className="text-muted-foreground px-1 text-sm">
						{f.items.filter((i: any) => i.isWalkIn).length > 0
							? `${f.items.filter((i: any) => !i.isWalkIn).length} order items · ${f.items.filter((i: any) => i.isWalkIn).length} walk-in`
							: `${f.items.length} items`}
					</p>
					{f.items.map((item: any) => (
						<PackingCard
							key={item.id}
							item={item}
							isSubmitted={isSubmitted}
							onUpdate={(patch) => handleUpdate(item, patch)}
							onDelete={
								item.isWalkIn
									? () => handleDeleteWalkIn(item)
									: undefined
							}
						/>
					))}
				</div>
			)}

			{/* Walk-in dialog */}
			<Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add Walk-in Item</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-1.5">
							<Label>Product Code / Barcode</Label>
							<Input
								placeholder="e.g. 8809..."
								value={walkIn.productCode}
								onChange={(e) =>
									setWalkIn((v) => ({
										...v,
										productCode: e.target.value,
									}))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label>
								Product Name{' '}
								<span className="text-destructive">*</span>
							</Label>
							<Input
								placeholder="e.g. Nuskinn Body Wax 400g"
								value={walkIn.productName}
								onChange={(e) =>
									setWalkIn((v) => ({
										...v,
										productName: e.target.value,
									}))
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<Label>Retail Qty</Label>
								<Input
									type="number"
									min={0}
									value={walkIn.fulfilledRetailQty || ''}
									onChange={(e) =>
										setWalkIn((v) => ({
											...v,
											fulfilledRetailQty: +e.target.value,
										}))
									}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Consumable Qty</Label>
								<Input
									type="number"
									min={0}
									value={walkIn.fulfilledConsumableQty || ''}
									onChange={(e) =>
										setWalkIn((v) => ({
											...v,
											fulfilledConsumableQty:
												+e.target.value,
										}))
									}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setWalkInOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleAddWalkIn}
							disabled={
								!walkIn.productName.trim() ||
								addWalkIn.isPending
							}
						>
							{addWalkIn.isPending && (
								<Loader2 className="mr-2 size-4 animate-spin" />
							)}
							Add Item
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ─── iPad-first packing card ──────────────────────────────────────────────────

function PackingCard({
	item,
	isSubmitted,
	onUpdate,
	onDelete,
}: {
	item: any;
	isSubmitted: boolean;
	onUpdate: (patch: {
		fulfilledRetailQty?: number;
		fulfilledConsumableQty?: number;
		isPacked?: boolean;
		notes?: string;
	}) => Promise<void>;
	onDelete?: () => void;
}) {
	const [retailVal, setRetailVal] = useState<number>(
		item.fulfilledRetailQty ?? 0
	);
	const [consumableVal, setConsumableVal] = useState<number>(
		item.fulfilledConsumableQty ?? 0
	);
	const [notesVal, setNotesVal] = useState<string>(item.notes ?? '');
	const [saving, setSaving] = useState(false);
	const notesTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	);

	// Sync when server data updates (TanStack Query refetch after mutation)
	useEffect(() => {
		setRetailVal(item.fulfilledRetailQty ?? 0);
		setConsumableVal(item.fulfilledConsumableQty ?? 0);
		setNotesVal(item.notes ?? '');
	}, [
		item.id,
		item.fulfilledRetailQty,
		item.fulfilledConsumableQty,
		item.notes,
	]);

	const showRetail = item.requestedRetailQty > 0 || item.isWalkIn;
	const showConsumable = item.requestedConsumableQty > 0 || item.isWalkIn;

	const retailShort =
		retailVal < item.requestedRetailQty && item.requestedRetailQty > 0;
	const consumableShort =
		consumableVal < item.requestedConsumableQty &&
		item.requestedConsumableQty > 0;
	const hasShortfall = retailShort || consumableShort;

	const stockLow =
		item.stockOnHand != null &&
		item.stockOnHand <
			(item.requestedRetailQty ?? 0) + (item.requestedConsumableQty ?? 0);

	async function saveQty(field: 'retail' | 'consumable', val: number) {
		if (isSubmitted) return;
		setSaving(true);
		try {
			await onUpdate(
				field === 'retail'
					? { fulfilledRetailQty: val }
					: { fulfilledConsumableQty: val }
			);
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

	const dividerCls = item.isPacked
		? 'border-emerald-200 dark:border-emerald-800'
		: 'border-border';

	return (
		<div
			className={cn(
				'rounded-xl border-2 transition-all duration-200',
				item.isPacked
					? 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-700 dark:bg-emerald-950/20'
					: hasShortfall
						? 'border-amber-300 bg-amber-50/40 dark:border-amber-700 dark:bg-amber-950/10'
						: 'border-border bg-card'
			)}
		>
			{/* Top: product name + packed toggle */}
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
							{item.productName}
						</p>
						{item.isWalkIn && (
							<span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
								Walk-in
							</span>
						)}
					</div>
					{item.productCode && (
						<p className="text-muted-foreground mt-0.5 font-mono text-xs">
							{item.productCode}
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

				{/* Big tap-friendly checkbox */}
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

			{/* Qty steppers */}
			{(showRetail || showConsumable) && (
				<div
					className={cn(
						'flex flex-wrap items-end gap-6 border-t px-5 py-4',
						dividerCls
					)}
				>
					{showRetail && (
						<QtyStepperField
							label="Retail"
							requested={item.requestedRetailQty}
							value={retailVal}
							disabled={isSubmitted}
							isShort={retailShort}
							isZero={
								item.requestedRetailQty > 0 && retailVal === 0
							}
							onChange={(v) => setRetailVal(v)}
							onCommit={(v) => saveQty('retail', v)}
						/>
					)}
					{showConsumable && (
						<QtyStepperField
							label="Consumable"
							requested={item.requestedConsumableQty}
							value={consumableVal}
							disabled={isSubmitted}
							isShort={consumableShort}
							isZero={
								item.requestedConsumableQty > 0 &&
								consumableVal === 0
							}
							onChange={(v) => setConsumableVal(v)}
							onCommit={(v) => saveQty('consumable', v)}
						/>
					)}
					{onDelete && !isSubmitted && (
						<button
							type="button"
							onClick={onDelete}
							className="text-muted-foreground hover:text-destructive ml-auto self-center p-1 transition-colors"
							aria-label="Remove walk-in item"
						>
							<Trash2 className="size-4" />
						</button>
					)}
				</div>
			)}

			{/* Notes textarea */}
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

// ─── Qty stepper — big buttons flanking the input ────────────────────────────

function QtyStepperField({
	label,
	requested,
	value,
	disabled,
	isShort,
	isZero,
	onChange,
	onCommit,
}: {
	label: string;
	requested: number;
	value: number;
	disabled: boolean;
	isShort: boolean;
	isZero: boolean;
	onChange: (v: number) => void;
	onCommit: (v: number) => void;
}) {
	function step(delta: number) {
		const next = Math.max(0, value + delta);
		onChange(next);
		onCommit(next);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-baseline gap-1.5">
				<span className="text-sm font-medium">{label}</span>
				<span className="text-muted-foreground text-xs">
					req: {requested}
				</span>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					disabled={disabled || value <= 0}
					onClick={() => step(-1)}
					className="bg-background hover:bg-muted flex h-10 w-10 items-center justify-center rounded-lg border transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
					aria-label={`Decrease ${label}`}
				>
					<Minus className="size-4" />
				</button>
				<Input
					type="number"
					min={0}
					value={value === 0 ? '' : value}
					disabled={disabled}
					placeholder="0"
					onChange={(e) => {
						const v = e.target.valueAsNumber;
						onChange(isNaN(v) ? 0 : v);
					}}
					onBlur={(e) => {
						const v = e.target.valueAsNumber;
						onCommit(isNaN(v) ? 0 : v);
					}}
					className={cn(
						'h-10 w-16 text-center text-lg font-bold',
						isZero && 'border-destructive text-destructive',
						isShort && !isZero && 'border-amber-400 text-amber-600'
					)}
				/>
				<button
					type="button"
					disabled={disabled}
					onClick={() => step(1)}
					className="bg-background hover:bg-muted flex h-10 w-10 items-center justify-center rounded-lg border transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
					aria-label={`Increase ${label}`}
				>
					<Plus className="size-4" />
				</button>
			</div>
		</div>
	);
}
