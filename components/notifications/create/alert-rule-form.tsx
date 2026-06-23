'use client';

import { useEffect } from 'react';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
	useCreateRule,
	useUpdateRule,
	type AlertRule,
	type AlertType,
} from '@/hooks/use-notifications';

const ALERT_TYPE_LABELS: Record<
	AlertType,
	{ label: string; description: string }
> = {
	LOW_STOCK: {
		label: 'Low Stock',
		description:
			'Fires when products reach or drop below their reorder point',
	},
	OUT_OF_STOCK: {
		label: 'Out of Stock',
		description: 'Fires when products have zero or negative inventory',
	},
	REORDER_NEEDED: {
		label: 'Reorder Needed',
		description: 'Combined alert: out of stock + low stock in one email',
	},
	DAILY_DIGEST: {
		label: 'Daily Digest',
		description: 'Summary email with stock health and recent movements',
	},
	PO_SENT: {
		label: 'PO Sent',
		description: 'Notification when a purchase order is marked as sent',
	},
	PO_RECEIVED: {
		label: 'PO Received',
		description: 'Notification when a purchase order is fully received',
	},
};

const schema = z.object({
	name: z.string().min(1, 'Required'),
	type: z.enum([
		'LOW_STOCK',
		'OUT_OF_STOCK',
		'REORDER_NEEDED',
		'DAILY_DIGEST',
		'PO_SENT',
		'PO_RECEIVED',
	]),
	recipients: z.string().min(1, 'At least one email required'),
	thresholdMonths: z.number().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

interface AlertRuleFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rule?: AlertRule | null;
}

export function AlertRuleForm({
	open,
	onOpenChange,
	rule,
}: AlertRuleFormProps) {
	const create = useCreateRule();
	const update = useUpdateRule();
	const isEdit = !!rule;

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: '',
			type: 'REORDER_NEEDED',
			recipients: '',
			thresholdMonths: undefined,
		},
	});

	const watchedType = form.watch('type');

	useEffect(() => {
		if (rule) {
			form.reset({
				name: rule.name,
				type: rule.type,
				recipients: rule.recipients.join(', '),
				thresholdMonths: rule.thresholdMonths ?? undefined,
			});
		} else {
			form.reset({
				name: '',
				type: 'REORDER_NEEDED',
				recipients: '',
				thresholdMonths: undefined,
			});
		}
	}, [rule, form]);

	async function onSubmit(values: FormValues) {
		try {
			if (isEdit && rule) {
				await update.mutateAsync({ id: rule.id, ...values });
				toast.success('Alert rule updated');
			} else {
				await create.mutateAsync(values);
				toast.success('Alert rule created');
			}
			onOpenChange(false);
		} catch (err: unknown) {
			const msg =
				err && typeof err === 'object' && 'response' in err
					? (err as { response?: { data?: { error?: string } } })
							.response?.data?.error
					: undefined;
			toast.error(msg ?? 'Failed to save rule');
		}
	}

	const isPending = create.isPending || update.isPending;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader className="px-6 pt-6 pb-2">
					<SheetTitle>
						{isEdit ? 'Edit Alert Rule' : 'Add Alert Rule'}
					</SheetTitle>
					<SheetDescription>
						Configure when and who gets notified.
					</SheetDescription>
				</SheetHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-5 px-6 pb-6"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Rule Name</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g. Warehouse Low Stock"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Alert Type</FormLabel>
									<Select
										onValueChange={field.onChange}
										value={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{(
												Object.entries(
													ALERT_TYPE_LABELS
												) as [
													AlertType,
													{
														label: string;
														description: string;
													},
												][]
											).map(([value, { label }]) => (
												<SelectItem
													key={value}
													value={value}
												>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{watchedType && (
										<FormDescription>
											{
												ALERT_TYPE_LABELS[
													watchedType as AlertType
												]?.description
											}
										</FormDescription>
									)}
									<FormMessage />
								</FormItem>
							)}
						/>

						<Separator />

						<FormField
							control={form.control}
							name="recipients"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Recipients</FormLabel>
									<FormControl>
										<Input
											placeholder="email@example.com, another@example.com"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Comma-separated list of email addresses.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{(watchedType === 'LOW_STOCK' ||
							watchedType === 'REORDER_NEEDED') && (
							<FormField
								control={form.control}
								name="thresholdMonths"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Months Threshold{' '}
											<span className="text-muted-foreground">
												(optional)
											</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={0}
												step={0.5}
												placeholder="2"
												value={field.value ?? ''}
												onChange={(e) =>
													field.onChange(
														e.target.value === ''
															? undefined
															: e.target
																	.valueAsNumber
													)
												}
											/>
										</FormControl>
										<FormDescription>
											Override: alert if months of stock
											remaining falls below this value.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<div className="flex justify-end gap-3 border-t pt-5">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending
									? 'Saving…'
									: isEdit
										? 'Save Changes'
										: 'Create Rule'}
							</Button>
						</div>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
}
