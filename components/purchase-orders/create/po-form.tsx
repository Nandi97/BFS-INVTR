'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCreatePO } from '@/hooks/use-purchase-orders';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useLocations } from '@/hooks/use-locations';
import { useProductsMinimal } from '@/hooks/use-products';
import { ProductCombobox } from '@/components/ui/product-combobox';

const itemSchema = z.object({
	productId: z.string().min(1, 'Select a product'),
	quantity: z.number().positive('Must be > 0'),
	unitCost: z.number().min(0).optional(),
	notes: z.string().optional(),
});

const schema = z.object({
	supplierId: z.string().min(1, 'Select a supplier'),
	locationId: z.string().min(1, 'Select a location'),
	notes: z.string().optional(),
	items: z.array(itemSchema).min(1, 'Add at least one item'),
});

type FormValues = z.infer<typeof schema>;

interface POFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function POForm({ open, onOpenChange }: POFormProps) {
	const create = useCreatePO();
	const { data: suppliersData } = useSuppliers({ active: true, limit: 100 });
	const { data: locationsData } = useLocations({ active: true });
	const { data: productsData } = useProductsMinimal();

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			supplierId: '',
			locationId: '',
			notes: '',
			items: [
				{ productId: '', quantity: 1, unitCost: undefined, notes: '' },
			],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'items',
	});

	const suppliers = suppliersData?.data ?? [];
	const locations = locationsData ?? [];
	const products = productsData ?? [];

	async function onSubmit(values: FormValues) {
		try {
			const po = await create.mutateAsync({
				supplierId: values.supplierId,
				locationId: values.locationId,
				notes: values.notes || undefined,
				items: values.items.map((i) => ({
					productId: i.productId,
					quantity: i.quantity,
					unitCost: i.unitCost,
					notes: i.notes || undefined,
				})),
			});
			toast.success(`Created ${po.poNumber}`);
			form.reset();
			onOpenChange(false);
		} catch (err: unknown) {
			const msg =
				err && typeof err === 'object' && 'response' in err
					? (err as { response?: { data?: { error?: string } } })
							.response?.data?.error
					: undefined;
			toast.error(msg ?? 'Failed to create purchase order');
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
				<SheetHeader className="px-6 pt-6 pb-2">
					<SheetTitle>New Purchase Order</SheetTitle>
					<SheetDescription>
						Create a draft PO — a PO number will be assigned
						automatically.
					</SheetDescription>
				</SheetHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-5 px-6 pb-6"
					>
						{/* Header */}
						<div className="grid grid-cols-2 gap-3">
							<FormField
								control={form.control}
								name="supplierId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Supplier</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select supplier" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{suppliers.map((s) => (
													<SelectItem
														key={s.id}
														value={s.id}
													>
														{s.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="locationId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Deliver To</FormLabel>
										<Select
											onValueChange={field.onChange}
											value={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select location" />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												{locations.map((l) => (
													<SelectItem
														key={l.id}
														value={l.id}
													>
														{l.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="notes"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Notes{' '}
										<span className="text-muted-foreground">
											(optional)
										</span>
									</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Delivery instructions, payment terms…"
											rows={2}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Separator />

						{/* Line items */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-sm font-medium">
									Line Items
								</p>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() =>
										append({
											productId: '',
											quantity: 1,
											unitCost: undefined,
											notes: '',
										})
									}
								>
									<Plus className="mr-1.5 size-3.5" /> Add
									Item
								</Button>
							</div>

							{form.formState.errors.items?.root && (
								<p className="text-destructive text-xs">
									{form.formState.errors.items.root.message}
								</p>
							)}

							<div className="space-y-3">
								{fields.map((field, index) => (
									<div
										key={field.id}
										className="space-y-3 rounded-lg border p-3"
									>
										<div className="flex items-start gap-2">
											<div className="flex-1 space-y-3">
												<FormField
													control={form.control}
													name={`items.${index}.productId`}
													render={({ field: f }) => (
														<FormItem>
															<FormLabel className="text-xs">
																Product
															</FormLabel>
															<FormControl>
																<ProductCombobox
																	products={
																		products
																	}
																	value={
																		f.value
																	}
																	onChange={
																		f.onChange
																	}
																	size="sm"
																/>
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
												<div className="grid grid-cols-2 gap-2">
													<FormField
														control={form.control}
														name={`items.${index}.quantity`}
														render={({
															field: f,
														}) => (
															<FormItem>
																<FormLabel className="text-xs">
																	Qty
																</FormLabel>
																<FormControl>
																	<Input
																		type="number"
																		min={1}
																		className="h-8 text-sm"
																		value={
																			f.value ??
																			''
																		}
																		onChange={(
																			e
																		) =>
																			f.onChange(
																				e
																					.target
																					.valueAsNumber
																			)
																		}
																	/>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
													<FormField
														control={form.control}
														name={`items.${index}.unitCost`}
														render={({
															field: f,
														}) => (
															<FormItem>
																<FormLabel className="text-xs">
																	Unit Cost{' '}
																	<span className="text-muted-foreground">
																		(opt.)
																	</span>
																</FormLabel>
																<FormControl>
																	<Input
																		type="number"
																		min={0}
																		step={
																			0.01
																		}
																		placeholder="0.00"
																		className="h-8 text-sm"
																		value={
																			f.value ??
																			''
																		}
																		onChange={(
																			e
																		) =>
																			f.onChange(
																				e
																					.target
																					.value ===
																					''
																					? undefined
																					: e
																							.target
																							.valueAsNumber
																			)
																		}
																	/>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</div>
											</div>
											{fields.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="text-muted-foreground hover:text-destructive mt-5 size-7 shrink-0"
													onClick={() =>
														remove(index)
													}
												>
													<Trash2 className="size-3.5" />
												</Button>
											)}
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="flex justify-end gap-3 border-t pt-5">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={create.isPending}>
								{create.isPending ? 'Creating…' : 'Create PO'}
							</Button>
						</div>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
}
