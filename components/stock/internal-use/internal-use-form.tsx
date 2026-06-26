'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, PackageOpen, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { ProductCombobox } from '@/components/ui/product-combobox';
import { useLocations } from '@/hooks/use-locations';
import { useProductsMinimal } from '@/hooks/use-products';
import { useLogInternalUseBatch } from '@/hooks/use-stock';
import { EmptyState } from '@/components/ui/empty-state';

const INTERNAL_USE_REASONS = [
	'Staff Training',
	'Management Use',
	'Demo / Display',
	'Quality Check / Sampling',
	'Write-off (damaged/expired)',
	'Other',
] as const;

const lineItemSchema = z.object({
	productId: z.string().min(1, 'Select a product'),
	locationId: z.string().min(1, 'Select a location'),
	quantity: z.number({ error: 'Required' }).positive('Must be positive'),
	reason: z.enum(INTERNAL_USE_REASONS),
	notes: z.string().optional(),
});

const formSchema = z.object({
	items: z.array(lineItemSchema).min(1, 'Add at least one item'),
	recipientEmail: z
		.string()
		.email('Must be a valid email')
		.optional()
		.or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

function makeBlankItem(defaultLocationId?: string) {
	return {
		productId: '',
		locationId: defaultLocationId ?? '',
		quantity: 1,
		reason: 'Staff Training' as const,
		notes: '',
	};
}

export function InternalUseForm() {
	const logBatch = useLogInternalUseBatch();
	const { data: locations } = useLocations({ active: true });
	const { data: products } = useProductsMinimal();
	const [submitted, setSubmitted] = useState(false);

	const defaultLocationId = locations?.[0]?.id;

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			items: [makeBlankItem()],
			recipientEmail: '',
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'items',
	});

	const productList = products ?? [];

	async function onSubmit(values: FormValues) {
		try {
			await logBatch.mutateAsync({
				items: values.items.map((item) => ({
					productId: item.productId,
					locationId: item.locationId,
					quantity: item.quantity,
					reason: item.reason,
					notes: item.notes || undefined,
				})),
				recipientEmail: values.recipientEmail || undefined,
			});
			toast.success(
				`${values.items.length} item${values.items.length !== 1 ? 's' : ''} logged — stock updated${values.recipientEmail ? ' and slip sent' : ''}`
			);
			form.reset({
				items: [makeBlankItem(defaultLocationId)],
				recipientEmail: '',
			});
			setSubmitted(true);
			setTimeout(() => setSubmitted(false), 3000);
		} catch {
			toast.error('Failed to log internal use');
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Internal Use
				</h1>
				<p className="text-muted-foreground mt-0.5 text-sm">
					Log products taken for training, demos, management use, or
					write-offs. Stock is reduced immediately and excluded from
					store dispatch reports.
				</p>
			</div>

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-6"
				>
					{/* Line items */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<p className="text-sm font-medium">Items</p>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() =>
									append(makeBlankItem(defaultLocationId))
								}
							>
								<Plus className="mr-1.5 size-3.5" />
								Add item
							</Button>
						</div>

						{fields.length === 0 && (
							<EmptyState
								icon={PackageOpen}
								title="No items yet"
								description='Click "Add item" to start logging.'
							/>
						)}

						{fields.map((field, idx) => (
							<div
								key={field.id}
								className="bg-muted/30 space-y-4 rounded-lg border p-4"
							>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
										Item {idx + 1}
									</span>
									{fields.length > 1 && (
										<Button
											type="button"
											size="icon"
											variant="ghost"
											className="text-destructive hover:text-destructive size-7"
											onClick={() => remove(idx)}
										>
											<Trash2 className="size-3.5" />
										</Button>
									)}
								</div>

								<FormField
									control={form.control}
									name={`items.${idx}.productId`}
									render={({ field: f }) => (
										<FormItem>
											<FormLabel>Product</FormLabel>
											<FormControl>
												<ProductCombobox
													products={productList}
													value={f.value}
													onChange={f.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<FormField
										control={form.control}
										name={`items.${idx}.locationId`}
										render={({ field: f }) => (
											<FormItem>
												<FormLabel>
													From Location
												</FormLabel>
												<Select
													onValueChange={f.onChange}
													value={f.value}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select location…" />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{locations?.map((l) => (
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

									<FormField
										control={form.control}
										name={`items.${idx}.quantity`}
										render={({ field: f }) => (
											<FormItem>
												<FormLabel>Quantity</FormLabel>
												<FormControl>
													<Input
														type="number"
														min={0.01}
														step={0.01}
														value={f.value ?? ''}
														onChange={(e) =>
															f.onChange(
																e.target
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

								<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
									<FormField
										control={form.control}
										name={`items.${idx}.reason`}
										render={({ field: f }) => (
											<FormItem>
												<FormLabel>Reason</FormLabel>
												<Select
													onValueChange={f.onChange}
													value={f.value}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{INTERNAL_USE_REASONS.map(
															(r) => (
																<SelectItem
																	key={r}
																	value={r}
																>
																	{r}
																</SelectItem>
															)
														)}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name={`items.${idx}.notes`}
										render={({ field: f }) => (
											<FormItem>
												<FormLabel>
													Notes{' '}
													<span className="text-muted-foreground">
														(optional)
													</span>
												</FormLabel>
												<FormControl>
													<Textarea
														placeholder="Any context…"
														rows={1}
														className="resize-none"
														{...f}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</div>
						))}
					</div>

					<Separator />

					{/* Requester email */}
					<div className="space-y-3">
						<div>
							<p className="text-sm font-medium">
								Email slip{' '}
								<span className="text-muted-foreground font-normal">
									(optional)
								</span>
							</p>
							<p className="text-muted-foreground mt-0.5 text-xs">
								A slip listing the items above will be emailed
								to this address. Addresses configured under
								Settings → Email Recipients will be CC'd
								automatically.
							</p>
						</div>

						<FormField
							control={form.control}
							name="recipientEmail"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Requester email</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="person@example.com"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="flex justify-end gap-3 border-t pt-5">
						<Button
							type="button"
							variant="outline"
							onClick={() =>
								form.reset({
									items: [makeBlankItem(defaultLocationId)],
									recipientEmail: '',
								})
							}
						>
							Clear
						</Button>
						<Button
							type="submit"
							disabled={logBatch.isPending || fields.length === 0}
						>
							{logBatch.isPending ? (
								'Saving…'
							) : (
								<>
									<Send className="mr-1.5 size-3.5" />
									Submit{' '}
									{fields.length > 1
										? `${fields.length} items`
										: 'item'}
								</>
							)}
						</Button>
					</div>

					{submitted && (
						<p className="text-center text-sm text-emerald-600 dark:text-emerald-400">
							Logged successfully.
						</p>
					)}
				</form>
			</Form>
		</div>
	);
}
