'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
	ArrowLeft,
	Package,
	CheckCircle2,
	Plus,
	Trash2,
	Send,
	Loader2,
	RefreshCw,
	AlertTriangle,
	AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
	useZenotiOrder,
	useCreateFulfillment,
	useUpdateFulfillmentItem,
	useAddWalkInItem,
	useDeleteWalkInItem,
	useSubmitFulfillment,
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

	// Progress — how many items packed
	const packedCount = f?.items.filter((i: any) => i.isPacked).length ?? 0;
	const totalItems = f?.items.length ?? order.items.length;
	const progress =
		totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

	async function startPacking() {
		await createFulfillment.mutateAsync(orderId);
		toast.success('Fulfillment started — items pre-loaded from Zenoti');
	}

	async function handleTogglePacked(item: any) {
		if (isSubmitted) return;
		await updateItem.mutateAsync({
			fulfillmentId: f.id,
			itemId: item.id,
			orderId,
			isPacked: !item.isPacked,
		});
	}

	async function handleQtyChange(
		item: any,
		field: 'fulfilledRetailQty' | 'fulfilledConsumableQty',
		value: number
	) {
		if (isSubmitted) return;
		await updateItem.mutateAsync({
			fulfillmentId: f.id,
			itemId: item.id,
			orderId,
			[field]: isNaN(value) ? 0 : value,
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
		toast.success('Item removed');
	}

	async function handleSubmit() {
		const unpacked = f.items.filter((i: any) => !i.isPacked);
		if (unpacked.length > 0) {
			const ok = confirm(
				`${unpacked.length} item(s) not checked. Submit anyway?`
			);
			if (!ok) return;
		}
		const result = await submitFulfillment.mutateAsync({
			fulfillmentId: f.id,
			orderId,
		});
		if (result.ok) {
			toast.success('Packing list emailed to accounting!');
		}
	}

	return (
		<div className="mx-auto max-w-4xl space-y-6">
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

				<div className="flex flex-wrap gap-2">
					{!f && (
						<Button
							onClick={startPacking}
							disabled={createFulfillment.isPending}
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
								size="sm"
								className="gap-1.5"
								onClick={() => setWalkInOpen(true)}
							>
								<Plus className="size-4" /> Add Walk-in Item
							</Button>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										size="sm"
										className="gap-1.5"
										disabled={submitFulfillment.isPending}
									>
										{submitFulfillment.isPending ? (
											<Loader2 className="size-4 animate-spin" />
										) : (
											<Send className="size-4" />
										)}
										Submit & Email
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Submit packing list?
										</AlertDialogTitle>
										<AlertDialogDescription>
											This will email the packing list to{' '}
											<strong>
												accounting@beautyfirstspa.com
											</strong>{' '}
											(CC: order@beautylogix.ca). The
											fulfillment will be marked as
											submitted and can no longer be
											edited.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>
											Cancel
										</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleSubmit}
										>
											Send email
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</>
					)}
					{isSubmitted && (
						<Badge className="gap-1.5 bg-emerald-600 px-3 py-1.5 text-sm text-white">
							<CheckCircle2 className="size-4" /> Submitted
						</Badge>
					)}
				</div>
			</div>

			{/* Progress bar */}
			{f && (
				<Card>
					<CardContent className="pt-4 pb-4">
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
				// Show Zenoti items (read-only preview before packing starts)
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
									className="flex items-center justify-between px-4 py-3"
								>
									<div>
										<p className="text-sm font-medium">
											{item.productName}
										</p>
										<p className="text-muted-foreground font-mono text-xs">
											{item.productCode}
										</p>
									</div>
									<div className="flex gap-4 text-right text-sm">
										{item.retailRaised > 0 && (
											<div>
												<p className="text-muted-foreground text-xs">
													Retail
												</p>
												<p className="font-semibold">
													{item.retailRaised}
												</p>
											</div>
										)}
										{item.consumableRaised > 0 && (
											<div>
												<p className="text-muted-foreground text-xs">
													Consumable
												</p>
												<p className="font-semibold">
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
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Pack Items</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<div className="divide-y">
							{f.items.map((item: any) => (
								<PackingRow
									key={item.id}
									item={item}
									isSubmitted={isSubmitted}
									onTogglePacked={handleTogglePacked}
									onQtyChange={handleQtyChange}
									onDelete={
										item.isWalkIn
											? handleDeleteWalkIn
											: undefined
									}
									isMutating={updateItem.isPending}
								/>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Walk-in dialog */}
			<Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add Walk-in Item</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-1">
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
						<div className="space-y-1">
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
							<div className="space-y-1">
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
							<div className="space-y-1">
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
							{addWalkIn.isPending ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : null}
							Add Item
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ─── Individual packing row ───────────────────────────────────────────────────

function PackingRow({
	item,
	isSubmitted,
	onTogglePacked,
	onQtyChange,
	onDelete,
	isMutating,
}: {
	item: any;
	isSubmitted: boolean;
	onTogglePacked: (item: any) => void;
	onQtyChange: (
		item: any,
		field: 'fulfilledRetailQty' | 'fulfilledConsumableQty',
		value: number
	) => void;
	onDelete?: (item: any) => void;
	isMutating: boolean;
}) {
	const hasShortfall =
		item.fulfilledRetailQty < item.requestedRetailQty ||
		item.fulfilledConsumableQty < item.requestedConsumableQty;

	return (
		<div
			className={cn(
				'flex items-start gap-3 px-4 py-4 transition-colors',
				item.isPacked && 'bg-emerald-50/50 dark:bg-emerald-950/20'
			)}
		>
			{/* Checkbox — big for iPad */}
			<button
				type="button"
				disabled={isSubmitted || isMutating}
				onClick={() => onTogglePacked(item)}
				className={cn(
					'mt-1 flex size-7 flex-shrink-0 items-center justify-center rounded border-2 transition-all',
					item.isPacked
						? 'border-emerald-500 bg-emerald-500 text-white'
						: 'border-muted-foreground/40 hover:border-primary',
					isSubmitted && 'cursor-not-allowed opacity-50'
				)}
				aria-label={item.isPacked ? 'Unmark packed' : 'Mark packed'}
			>
				{item.isPacked && <CheckCircle2 className="size-4" />}
			</button>

			{/* Product info */}
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<p
						className={cn(
							'text-sm font-medium',
							item.isPacked &&
								'text-muted-foreground line-through'
						)}
					>
						{item.productName}
					</p>
					{item.isWalkIn && (
						<Badge
							variant="outline"
							className="border-violet-400 text-xs text-violet-600"
						>
							Walk-in
						</Badge>
					)}
					{hasShortfall && !item.isPacked && (
						<AlertTriangle className="size-3.5 flex-shrink-0 text-amber-500" />
					)}
				</div>
				{item.productCode && (
					<p className="text-muted-foreground font-mono text-xs">
						{item.productCode}
					</p>
				)}
				{item.stockOnHand !== null &&
					item.stockOnHand !== undefined && (
						<p
							className={cn(
								'mt-0.5 text-xs',
								item.stockOnHand <
									item.requestedRetailQty +
										item.requestedConsumableQty
									? 'font-medium text-amber-600'
									: 'text-muted-foreground'
							)}
						>
							{item.stockOnHand} in warehouse
						</p>
					)}
			</div>

			{/* Qty inputs */}
			<div className="flex flex-shrink-0 items-end gap-3">
				{(item.requestedRetailQty > 0 || item.isWalkIn) && (
					<QtyField
						label="Retail"
						requested={item.requestedRetailQty}
						value={item.fulfilledRetailQty}
						disabled={isSubmitted}
						onChange={(v) =>
							onQtyChange(item, 'fulfilledRetailQty', v)
						}
					/>
				)}
				{(item.requestedConsumableQty > 0 || item.isWalkIn) && (
					<QtyField
						label="Consumable"
						requested={item.requestedConsumableQty}
						value={item.fulfilledConsumableQty}
						disabled={isSubmitted}
						onChange={(v) =>
							onQtyChange(item, 'fulfilledConsumableQty', v)
						}
					/>
				)}
				{onDelete && !isSubmitted && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="text-destructive hover:text-destructive"
						onClick={() => onDelete(item)}
					>
						<Trash2 className="size-4" />
					</Button>
				)}
			</div>
		</div>
	);
}

function QtyField({
	label,
	requested,
	value,
	disabled,
	onChange,
}: {
	label: string;
	requested: number;
	value: number;
	disabled: boolean;
	onChange: (v: number) => void;
}) {
	const isShort = value < requested;

	return (
		<div className="text-center">
			<p className="text-muted-foreground mb-1 text-xs">{label}</p>
			<p className="text-muted-foreground text-[10px]">
				req: {requested}
			</p>
			<Input
				type="number"
				min={0}
				value={value || ''}
				disabled={disabled}
				onChange={(e) => onChange(e.target.valueAsNumber)}
				className={cn(
					'h-10 w-20 text-center text-base font-semibold',
					isShort && value > 0 && 'border-amber-400 text-amber-600',
					value === 0 &&
						requested > 0 &&
						'border-destructive text-destructive'
				)}
			/>
		</div>
	);
}
