'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
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
	FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSetThresholds, type InventoryRow } from '@/hooks/use-stock';

const schema = z.object({
	minQuantity: z.number().min(0),
	reorderPoint: z.number().min(0),
	reorderQty: z.number().min(0),
});

type FormValues = z.infer<typeof schema>;

interface SetThresholdsFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	row: InventoryRow | null;
}

export function SetThresholdsForm({
	open,
	onOpenChange,
	row,
}: SetThresholdsFormProps) {
	const setThresholds = useSetThresholds();

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		values: {
			minQuantity: row?.minQuantity ?? 0,
			reorderPoint: row?.reorderPoint ?? 0,
			reorderQty: row?.reorderQty ?? 0,
		},
	});

	async function onSubmit(values: FormValues) {
		if (!row) return;
		try {
			await setThresholds.mutateAsync({
				productId: row.productId,
				locationId: row.locationId,
				...values,
			});
			toast.success('Thresholds updated');
			onOpenChange(false);
		} catch {
			toast.error('Failed to update thresholds');
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-lg">
				<SheetHeader className="px-6 pt-6 pb-2">
					<SheetTitle>Set Thresholds</SheetTitle>
					<SheetDescription>
						{row
							? `${row.product.name} · ${row.location.name}`
							: 'Set stock thresholds'}
					</SheetDescription>
				</SheetHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-5 px-6 pb-6"
					>
						<FormField
							control={form.control}
							name="minQuantity"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Minimum Quantity</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={0}
											step={1}
											value={field.value ?? ''}
											onChange={(e) =>
												field.onChange(
													e.target.valueAsNumber
												)
											}
										/>
									</FormControl>
									<FormDescription>
										Alert fires when stock falls below this.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="reorderPoint"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Reorder Point</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={0}
											step={1}
											value={field.value ?? ''}
											onChange={(e) =>
												field.onChange(
													e.target.valueAsNumber
												)
											}
										/>
									</FormControl>
									<FormDescription>
										Stock level at which to place a new
										order.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="reorderQty"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Reorder Quantity</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={0}
											step={1}
											value={field.value ?? ''}
											onChange={(e) =>
												field.onChange(
													e.target.valueAsNumber
												)
											}
										/>
									</FormControl>
									<FormDescription>
										Suggested order quantity when reorder
										point is reached.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

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
								disabled={setThresholds.isPending}
							>
								{setThresholds.isPending
									? 'Saving…'
									: 'Save Thresholds'}
							</Button>
						</div>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
}
