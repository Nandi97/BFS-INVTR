'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
	usePendingProducts,
	useApprovePendingProduct,
	useDismissPendingProduct,
	useIgnorePendingProduct,
	useBatchDismissPendingProducts,
	useBatchApprovePendingProducts,
	useBatchIgnorePendingProducts,
	type PendingProduct,
	type ApproveInput,
	type BatchApproveInput,
} from '@/hooks/use-products';
import { useBrands } from '@/hooks/use-brands';
import { useCategories } from '@/hooks/use-categories';
import { useLocations } from '@/hooks/use-locations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	PackageSearch,
	CheckCircle,
	Trash2,
	X,
	Ban,
	MoreHorizontal,
	RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Single-item approve sheet ────────────────────────────────────────────────

function ApproveSheet({
	item,
	open,
	onOpenChange,
}: {
	item: PendingProduct;
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const approve = useApprovePendingProduct();
	const { data: brandsData } = useBrands();
	const { data: categoriesData } = useCategories();
	const { data: locationsData } = useLocations({ active: true });

	const brands = brandsData ?? [];
	const categories =
		(categoriesData as Array<{ id: string; name: string }> | undefined) ??
		[];
	const locations = (locationsData ?? []).filter(
		(l: { isActive: boolean }) => l.isActive
	);

	const defaultWarehouse = locations.find((l: { name: string }) =>
		l.name.toLowerCase().includes('warehouse')
	);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<ApproveInput>({
		defaultValues: {
			name: item.qboName.includes(':')
				? item.qboName.split(':').pop()!.trim()
				: item.qboName,
			sku: item.qboSku ?? '',
			unit: 'each',
			locationId: defaultWarehouse?.id ?? '',
		},
	});

	const locationId = watch('locationId');
	const brandId = watch('brandId');
	const categoryId = watch('categoryId');

	function onSubmit(data: ApproveInput) {
		approve.mutate(
			{ ...data, id: item.id },
			{ onSuccess: () => onOpenChange(false) }
		);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader className="px-6 pt-6 pb-2">
					<SheetTitle>Add to Inventory</SheetTitle>
					<SheetDescription>
						QB item:{' '}
						<span className="text-foreground font-medium">
							{item.qboName}
						</span>
						{item.qtyOnHand > 0 && (
							<>
								{' '}
								·{' '}
								<span className="font-medium text-emerald-600">
									{item.qtyOnHand} units on hand
								</span>
							</>
						)}
					</SheetDescription>
				</SheetHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					className="space-y-5 px-6 pb-6"
				>
					<div className="space-y-1.5">
						<Label htmlFor="name">
							Product name{' '}
							<span className="text-destructive">*</span>
						</Label>
						<Input
							id="name"
							{...register('name', { required: true })}
						/>
						{errors.name && (
							<p className="text-destructive text-xs">Required</p>
						)}
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="sku">SKU</Label>
							<Input
								id="sku"
								{...register('sku')}
								placeholder={item.qboSku ?? 'e.g. ZEN-001'}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="barcode">Barcode</Label>
							<Input
								id="barcode"
								{...register('barcode')}
								placeholder="e.g. 0123456789"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label>Brand</Label>
						<Select
							value={brandId}
							onValueChange={(v) => setValue('brandId', v)}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={
										item.suggestedBrandName
											? `Suggested: ${item.suggestedBrandName}`
											: 'Select brand'
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{brands.map(
									(b: { id: string; name: string }) => (
										<SelectItem key={b.id} value={b.id}>
											{b.name}
										</SelectItem>
									)
								)}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label>Category</Label>
						<Select
							value={categoryId}
							onValueChange={(v) => setValue('categoryId', v)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select category" />
							</SelectTrigger>
							<SelectContent>
								{categories.map(
									(c: { id: string; name: string }) => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
										</SelectItem>
									)
								)}
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="unit">Unit</Label>
							<Input
								id="unit"
								{...register('unit')}
								placeholder="each"
							/>
						</div>
						<div className="space-y-1.5">
							<Label>
								Warehouse location{' '}
								<span className="text-destructive">*</span>
							</Label>
							<Select
								value={locationId}
								onValueChange={(v) => setValue('locationId', v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select location" />
								</SelectTrigger>
								<SelectContent>
									{locations.map(
										(l: { id: string; name: string }) => (
											<SelectItem key={l.id} value={l.id}>
												{l.name}
											</SelectItem>
										)
									)}
								</SelectContent>
							</Select>
							{!locationId && (
								<p className="text-destructive text-xs">
									Required
								</p>
							)}
						</div>
					</div>

					{item.purchaseCost != null && (
						<p className="text-muted-foreground text-xs">
							QB purchase cost:{' '}
							<span className="text-foreground font-medium">
								${item.purchaseCost.toFixed(2)}
							</span>{' '}
							— will be synced to supplier cost after approval.
						</p>
					)}

					<div className="flex justify-end gap-3 border-t pt-5">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={approve.isPending || !locationId}
						>
							{approve.isPending ? 'Adding…' : 'Add to Inventory'}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}

// ─── Batch add sheet ──────────────────────────────────────────────────────────

function BatchAddSheet({
	items,
	open,
	onOpenChange,
}: {
	items: PendingProduct[];
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const batchApprove = useBatchApprovePendingProducts();
	const { data: brandsData } = useBrands();
	const { data: categoriesData } = useCategories();
	const { data: locationsData } = useLocations({ active: true });

	const brands = brandsData ?? [];
	const categories =
		(categoriesData as Array<{ id: string; name: string }> | undefined) ??
		[];
	const locations = (locationsData ?? []).filter(
		(l: { isActive: boolean }) => l.isActive
	);

	const defaultWarehouse = locations.find((l: { name: string }) =>
		l.name.toLowerCase().includes('warehouse')
	);

	const { setValue, watch } = useForm<BatchApproveInput>({
		defaultValues: {
			ids: items.map((i) => i.id),
			unit: 'each',
			locationId: defaultWarehouse?.id ?? '',
		},
	});

	const locationId = watch('locationId');
	const brandId = watch('brandId');
	const categoryId = watch('categoryId');
	const unit = watch('unit');

	function onSubmit() {
		if (!locationId) return;
		batchApprove.mutate(
			{
				ids: items.map((i) => i.id),
				locationId,
				brandId: brandId || undefined,
				categoryId: categoryId || undefined,
				unit: unit || 'each',
			},
			{ onSuccess: () => onOpenChange(false) }
		);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader className="px-6 pt-6 pb-2">
					<SheetTitle>
						Add {items.length} Products to Inventory
					</SheetTitle>
					<SheetDescription>
						Set shared defaults applied to all selected items. Each
						product keeps its own QB name and SKU. You can edit
						individual details after approval.
					</SheetDescription>
				</SheetHeader>

				<div className="space-y-5 px-6 pb-6">
					<div className="bg-muted/50 rounded-md border">
						<div className="max-h-48 divide-y overflow-y-auto">
							{items.map((item) => {
								const displayName = item.qboName.includes(':')
									? item.qboName.split(':').pop()!.trim()
									: item.qboName;
								return (
									<div
										key={item.id}
										className="flex items-center justify-between gap-3 px-3 py-2"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium">
												{displayName}
											</p>
											{item.qboSku && (
												<p className="text-muted-foreground text-xs">
													{item.qboSku}
												</p>
											)}
										</div>
										{item.qtyOnHand > 0 && (
											<span className="shrink-0 text-xs font-medium text-emerald-600">
												{item.qtyOnHand} units
											</span>
										)}
									</div>
								);
							})}
						</div>
					</div>

					<div className="space-y-1.5">
						<Label>
							Warehouse location{' '}
							<span className="text-destructive">*</span>
						</Label>
						<Select
							value={locationId}
							onValueChange={(v) => setValue('locationId', v)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select location" />
							</SelectTrigger>
							<SelectContent>
								{locations.map(
									(l: { id: string; name: string }) => (
										<SelectItem key={l.id} value={l.id}>
											{l.name}
										</SelectItem>
									)
								)}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label>Brand</Label>
						<Select
							value={brandId ?? ''}
							onValueChange={(v) => setValue('brandId', v)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select brand (optional)" />
							</SelectTrigger>
							<SelectContent>
								{brands.map(
									(b: { id: string; name: string }) => (
										<SelectItem key={b.id} value={b.id}>
											{b.name}
										</SelectItem>
									)
								)}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label>Category</Label>
						<Select
							value={categoryId ?? ''}
							onValueChange={(v) => setValue('categoryId', v)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select category (optional)" />
							</SelectTrigger>
							<SelectContent>
								{categories.map(
									(c: { id: string; name: string }) => (
										<SelectItem key={c.id} value={c.id}>
											{c.name}
										</SelectItem>
									)
								)}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<Label>Unit</Label>
						<Input
							value={unit}
							onChange={(e) => setValue('unit', e.target.value)}
							placeholder="each"
						/>
					</div>

					<p className="text-muted-foreground text-xs">
						Products with a duplicate SKU will be skipped and
						reported in a toast. All others will be created.
					</p>

					<div className="flex justify-end gap-3 border-t pt-5">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={onSubmit}
							disabled={batchApprove.isPending || !locationId}
						>
							{batchApprove.isPending
								? 'Adding…'
								: `Add ${items.length} Product${items.length === 1 ? '' : 's'}`}
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function PendingProductsDashboard() {
	const [showIgnored, setShowIgnored] = useState(false);
	const { data, isLoading } = usePendingProducts(showIgnored);

	const dismiss = useDismissPendingProduct();
	const ignore = useIgnorePendingProduct();
	const batchDismiss = useBatchDismissPendingProducts();
	const batchIgnore = useBatchIgnorePendingProducts();

	const [approving, setApproving] = useState<PendingProduct | null>(null);
	const [batchAdding, setBatchAdding] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const items = data?.data ?? [];
	const ignoredCount = data?.ignoredCount ?? 0;

	const allSelected = items.length > 0 && selected.size === items.length;
	const someSelected = selected.size > 0 && selected.size < items.length;

	function toggleAll() {
		if (allSelected) setSelected(new Set());
		else setSelected(new Set(items.map((i) => i.id)));
	}

	function toggleOne(id: string) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function clearSelection() {
		setSelected(new Set());
	}

	const selectedItems = items.filter((i) => selected.has(i.id));

	function handleBatchDismiss() {
		batchDismiss.mutate([...selected], { onSuccess: clearSelection });
	}

	function handleBatchIgnore() {
		batchIgnore.mutate(
			{ ids: [...selected], ignored: true },
			{ onSuccess: clearSelection }
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">
						Pending from QuickBooks
					</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Products found in QB that don't match anything in BFS.
						Review, assign details, and add to inventory.
					</p>
				</div>

				{/* Ignored toggle */}
				{(ignoredCount > 0 || showIgnored) && (
					<Button
						variant="outline"
						size="sm"
						className="shrink-0"
						onClick={() => {
							setShowIgnored((v) => !v);
							clearSelection();
						}}
					>
						{showIgnored ? (
							<>
								<RotateCcw className="mr-1.5 size-3.5" />
								Back to pending
							</>
						) : (
							<>
								<Ban className="mr-1.5 size-3.5" />
								Ignored ({ignoredCount})
							</>
						)}
					</Button>
				)}
			</div>

			{showIgnored && (
				<p className="text-muted-foreground rounded-md border px-4 py-2.5 text-sm">
					Ignored items are permanently hidden from QB syncs. Use{' '}
					<strong>Restore</strong> to bring one back to the pending
					list.
				</p>
			)}

			{isLoading ? (
				<div className="space-y-2">
					{[...Array(5)].map((_, i) => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</div>
			) : items.length === 0 ? (
				<EmptyState
					icon={PackageSearch}
					title={
						showIgnored ? 'No ignored items' : 'No pending products'
					}
					description={
						showIgnored
							? 'No items have been permanently ignored.'
							: 'All QB items are matched to BFS products. Run a stock sync to check for new unmatched items.'
					}
				/>
			) : (
				<>
					{/* Bulk action bar */}
					{selected.size > 0 && (
						<div className="bg-muted/60 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5">
							<span className="text-sm font-medium">
								{selected.size} selected
							</span>
							<div className="flex flex-wrap gap-2">
								{showIgnored ? (
									// In ignored view: restore
									<Button
										size="sm"
										variant="outline"
										onClick={() =>
											batchIgnore.mutate(
												{
													ids: [...selected],
													ignored: false,
												},
												{ onSuccess: clearSelection }
											)
										}
										disabled={batchIgnore.isPending}
									>
										<RotateCcw className="mr-1.5 size-3.5" />
										Restore {selected.size}
									</Button>
								) : (
									// In pending view: add, dismiss, ignore
									<>
										<Button
											size="sm"
											variant="default"
											onClick={() => setBatchAdding(true)}
										>
											<CheckCircle className="mr-1.5 size-3.5" />
											Add {selected.size} to Inventory
										</Button>

										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													size="sm"
													variant="destructive"
												>
													<Trash2 className="mr-1.5 size-3.5" />
													Dismiss {selected.size}
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Dismiss {selected.size}{' '}
														item
														{selected.size === 1
															? ''
															: 's'}
														?
													</AlertDialogTitle>
													<AlertDialogDescription
														asChild
													>
														<div className="space-y-2">
															<p>
																These items will
																be removed from
																the pending
																list. They will
																reappear on the
																next QB sync if
																still unmatched.
															</p>
															{selectedItems.length <=
															8 ? (
																<ul className="mt-2 space-y-0.5 text-sm">
																	{selectedItems.map(
																		(i) => (
																			<li
																				key={
																					i.id
																				}
																				className="truncate"
																			>
																				·{' '}
																				{
																					i.qboName
																				}
																			</li>
																		)
																	)}
																</ul>
															) : (
																<p className="text-sm">
																	{selectedItems
																		.slice(
																			0,
																			5
																		)
																		.map(
																			(
																				i
																			) =>
																				i.qboName
																		)
																		.join(
																			', '
																		)}{' '}
																	and{' '}
																	{selectedItems.length -
																		5}{' '}
																	more.
																</p>
															)}
														</div>
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>
														Cancel
													</AlertDialogCancel>
													<AlertDialogAction
														onClick={
															handleBatchDismiss
														}
														className="bg-destructive hover:bg-destructive/90"
														disabled={
															batchDismiss.isPending
														}
													>
														{batchDismiss.isPending
															? 'Dismissing…'
															: 'Dismiss'}
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>

										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button
													size="sm"
													variant="outline"
												>
													<Ban className="mr-1.5 size-3.5" />
													Ignore {selected.size}{' '}
													permanently
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Permanently ignore{' '}
														{selected.size} item
														{selected.size === 1
															? ''
															: 's'}
														?
													</AlertDialogTitle>
													<AlertDialogDescription
														asChild
													>
														<div className="space-y-2">
															<p>
																These items will
																never reappear
																in the pending
																list, even after
																a QB sync. You
																can restore them
																later from the
																Ignored view.
															</p>
															{selectedItems.length <=
															8 ? (
																<ul className="mt-2 space-y-0.5 text-sm">
																	{selectedItems.map(
																		(i) => (
																			<li
																				key={
																					i.id
																				}
																				className="truncate"
																			>
																				·{' '}
																				{
																					i.qboName
																				}
																			</li>
																		)
																	)}
																</ul>
															) : (
																<p className="text-sm">
																	{selectedItems
																		.slice(
																			0,
																			5
																		)
																		.map(
																			(
																				i
																			) =>
																				i.qboName
																		)
																		.join(
																			', '
																		)}{' '}
																	and{' '}
																	{selectedItems.length -
																		5}{' '}
																	more.
																</p>
															)}
														</div>
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>
														Cancel
													</AlertDialogCancel>
													<AlertDialogAction
														onClick={
															handleBatchIgnore
														}
														disabled={
															batchIgnore.isPending
														}
													>
														{batchIgnore.isPending
															? 'Ignoring…'
															: 'Ignore permanently'}
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</>
								)}
							</div>

							<Button
								size="sm"
								variant="ghost"
								className="ml-auto"
								onClick={clearSelection}
							>
								<X className="mr-1 size-3.5" />
								Clear
							</Button>
						</div>
					)}

					<div className="rounded-lg border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-10 pl-4">
										<Checkbox
											checked={
												allSelected
													? true
													: someSelected
														? 'indeterminate'
														: false
											}
											onCheckedChange={toggleAll}
											aria-label="Select all"
										/>
									</TableHead>
									<TableHead>QB Name</TableHead>
									<TableHead>SKU</TableHead>
									<TableHead className="text-right">
										Qty on Hand
									</TableHead>
									<TableHead className="text-right">
										Cost
									</TableHead>
									<TableHead>Suggested Brand</TableHead>
									<TableHead>First Seen</TableHead>
									<TableHead>Seen</TableHead>
									<TableHead className="w-[120px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((item) => (
									<TableRow
										key={item.id}
										data-state={
											selected.has(item.id)
												? 'selected'
												: undefined
										}
										className="cursor-pointer"
										onClick={() => toggleOne(item.id)}
									>
										<TableCell
											className="pl-4"
											onClick={(e) => e.stopPropagation()}
										>
											<Checkbox
												checked={selected.has(item.id)}
												onCheckedChange={() =>
													toggleOne(item.id)
												}
												aria-label={`Select ${item.qboName}`}
											/>
										</TableCell>
										<TableCell
											className="max-w-[240px] truncate font-medium"
											title={item.qboName}
										>
											{item.qboName}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{item.qboSku ?? '—'}
										</TableCell>
										<TableCell className="text-right">
											<span
												className={
													item.qtyOnHand > 0
														? 'font-medium text-emerald-600'
														: 'text-muted-foreground'
												}
											>
												{item.qtyOnHand}
											</span>
										</TableCell>
										<TableCell className="text-right text-sm">
											{item.purchaseCost != null
												? `$${item.purchaseCost.toFixed(2)}`
												: '—'}
										</TableCell>
										<TableCell>
											{item.suggestedBrandName ? (
												<Badge variant="secondary">
													{item.suggestedBrandName}
												</Badge>
											) : (
												'—'
											)}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{formatDistanceToNow(
												new Date(item.firstSeenAt),
												{
													addSuffix: true,
												}
											)}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{item.seenCount}×
										</TableCell>
										<TableCell
											onClick={(e) => e.stopPropagation()}
										>
											<div className="flex items-center justify-end gap-1">
												{showIgnored ? (
													// Ignored view: just restore
													<Button
														size="sm"
														variant="ghost"
														className="h-8 text-xs"
														onClick={() =>
															ignore.mutate({
																id: item.id,
																ignored: false,
															})
														}
														disabled={
															ignore.isPending
														}
													>
														<RotateCcw className="mr-1 size-3.5" />
														Restore
													</Button>
												) : (
													// Pending view: add + overflow menu
													<>
														<Button
															size="sm"
															variant="ghost"
															className="h-8 text-xs"
															onClick={() =>
																setApproving(
																	item
																)
															}
														>
															<CheckCircle className="mr-1 size-3.5" />
															Add
														</Button>

														<DropdownMenu>
															<DropdownMenuTrigger
																asChild
															>
																<Button
																	size="sm"
																	variant="ghost"
																	className="h-8 w-8 p-0"
																>
																	<MoreHorizontal className="size-3.5" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<AlertDialog>
																	<AlertDialogTrigger
																		asChild
																	>
																		<DropdownMenuItem
																			onSelect={(
																				e
																			) =>
																				e.preventDefault()
																			}
																		>
																			<Trash2 className="mr-2 size-3.5" />
																			Dismiss
																		</DropdownMenuItem>
																	</AlertDialogTrigger>
																	<AlertDialogContent>
																		<AlertDialogHeader>
																			<AlertDialogTitle>
																				Dismiss
																				this
																				item?
																			</AlertDialogTitle>
																			<AlertDialogDescription>
																				<strong>
																					{
																						item.qboName
																					}
																				</strong>{' '}
																				will
																				be
																				removed
																				from
																				the
																				pending
																				list.
																				It
																				will
																				reappear
																				on
																				the
																				next
																				sync
																				if
																				it's
																				still
																				unmatched
																				in
																				QB.
																			</AlertDialogDescription>
																		</AlertDialogHeader>
																		<AlertDialogFooter>
																			<AlertDialogCancel>
																				Cancel
																			</AlertDialogCancel>
																			<AlertDialogAction
																				onClick={() =>
																					dismiss.mutate(
																						item.id
																					)
																				}
																				className="bg-destructive hover:bg-destructive/90"
																			>
																				Dismiss
																			</AlertDialogAction>
																		</AlertDialogFooter>
																	</AlertDialogContent>
																</AlertDialog>

																<DropdownMenuSeparator />

																<AlertDialog>
																	<AlertDialogTrigger
																		asChild
																	>
																		<DropdownMenuItem
																			onSelect={(
																				e
																			) =>
																				e.preventDefault()
																			}
																			className="text-muted-foreground"
																		>
																			<Ban className="mr-2 size-3.5" />
																			Ignore
																			permanently
																		</DropdownMenuItem>
																	</AlertDialogTrigger>
																	<AlertDialogContent>
																		<AlertDialogHeader>
																			<AlertDialogTitle>
																				Permanently
																				ignore
																				this
																				item?
																			</AlertDialogTitle>
																			<AlertDialogDescription>
																				<strong>
																					{
																						item.qboName
																					}
																				</strong>{' '}
																				will
																				never
																				reappear
																				in
																				the
																				pending
																				list,
																				even
																				after
																				a
																				QB
																				sync.
																				You
																				can
																				restore
																				it
																				later
																				from
																				the
																				Ignored
																				view.
																			</AlertDialogDescription>
																		</AlertDialogHeader>
																		<AlertDialogFooter>
																			<AlertDialogCancel>
																				Cancel
																			</AlertDialogCancel>
																			<AlertDialogAction
																				onClick={() =>
																					ignore.mutate(
																						{
																							id: item.id,
																							ignored: true,
																						}
																					)
																				}
																			>
																				Ignore
																				permanently
																			</AlertDialogAction>
																		</AlertDialogFooter>
																	</AlertDialogContent>
																</AlertDialog>
															</DropdownMenuContent>
														</DropdownMenu>
													</>
												)}
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</>
			)}

			{approving && (
				<ApproveSheet
					item={approving}
					open={!!approving}
					onOpenChange={(v) => {
						if (!v) setApproving(null);
					}}
				/>
			)}

			{batchAdding && selectedItems.length > 0 && (
				<BatchAddSheet
					items={selectedItems}
					open={batchAdding}
					onOpenChange={(v) => {
						if (!v) {
							setBatchAdding(false);
							clearSelection();
						}
					}}
				/>
			)}
		</div>
	);
}
