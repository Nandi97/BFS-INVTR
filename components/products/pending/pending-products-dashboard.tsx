'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
	usePendingProducts,
	useApprovePendingProduct,
	useDismissPendingProduct,
	type PendingProduct,
	type ApproveInput,
} from '@/hooks/use-products';
import { useBrands } from '@/hooks/use-brands';
import { useCategories } from '@/hooks/use-categories';
import { useLocations } from '@/hooks/use-locations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { PackageSearch, CheckCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

					<div className="grid grid-cols-2 gap-4">
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

					<div className="grid grid-cols-2 gap-4">
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

export function PendingProductsDashboard() {
	const { data, isLoading } = usePendingProducts();
	const dismiss = useDismissPendingProduct();
	const [approving, setApproving] = useState<PendingProduct | null>(null);

	const items = data?.data ?? [];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">
					Pending from QuickBooks
				</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Products found in QB that don't match anything in BFS.
					Review, assign details, and add to inventory.
				</p>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{[...Array(5)].map((_, i) => (
						<Skeleton key={i} className="h-12 w-full" />
					))}
				</div>
			) : items.length === 0 ? (
				<EmptyState
					icon={PackageSearch}
					title="No pending products"
					description="All QB items are matched to BFS products. Run a stock sync to check for new unmatched items."
				/>
			) : (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
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
								<TableRow key={item.id}>
									<TableCell
										className="max-w-[260px] truncate font-medium"
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
											{ addSuffix: true }
										)}
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{item.seenCount}×
									</TableCell>
									<TableCell>
										<div className="flex items-center justify-end gap-1">
											<Button
												size="sm"
												variant="ghost"
												className="h-8 text-xs"
												onClick={() =>
													setApproving(item)
												}
											>
												<CheckCircle className="mr-1 size-3.5" />
												Add
											</Button>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														size="sm"
														variant="ghost"
														className="text-muted-foreground hover:text-destructive h-8 text-xs"
													>
														<Trash2 className="size-3.5" />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															Dismiss this item?
														</AlertDialogTitle>
														<AlertDialogDescription>
															<strong>
																{item.qboName}
															</strong>{' '}
															will be removed from
															the pending list. It
															will reappear on the
															next sync if it's
															still unmatched in
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
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
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
		</div>
	);
}
