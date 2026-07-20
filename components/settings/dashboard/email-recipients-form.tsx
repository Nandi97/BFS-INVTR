'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

type Recipients = {
	zenoti_email_warehouse: string;
	zenoti_email_costco: string;
	zenoti_email_inverness: string;
	zenoti_email_other: string;
	zenoti_email_packing_list_to: string;
	zenoti_email_packing_list_cc: string;
	internal_use_cc: string;
	shopify_order_notify_to: string;
	shopify_order_notify_cc: string;
	shopify_non_warehoused_notify_to: string;
	shopify_packing_list_to: string;
	shopify_packing_list_cc: string;
};

const FIELDS: {
	key: keyof Recipients;
	label: string;
	description: string;
	required?: boolean;
}[] = [
	{
		key: 'zenoti_email_warehouse',
		label: 'Warehouse orders',
		description: 'Orders supplied by Beauty Logix warehouse',
		required: true,
	},
	{
		key: 'zenoti_email_costco',
		label: 'Costco orders',
		description: 'Orders supplied directly by Costco',
		required: true,
	},
	{
		key: 'zenoti_email_inverness',
		label: 'Inverness orders',
		description: 'Orders supplied directly by Inverness',
		required: true,
	},
	{
		key: 'zenoti_email_other',
		label: 'Other / External orders',
		description: 'All other supplier types',
		required: true,
	},
];

function useEmailRecipients() {
	return useQuery<Recipients>({
		queryKey: ['email-recipients'],
		queryFn: () =>
			api.get('/settings/email-recipients').then((r) => r.data),
	});
}

function useSaveEmailRecipients() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Recipients) =>
			api.patch('/settings/email-recipients', data).then((r) => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['email-recipients'] });
			toast.success('Email recipients saved');
		},
		onError: () => toast.error('Failed to save recipients'),
	});
}

export function EmailRecipientsForm() {
	const { data, isLoading } = useEmailRecipients();
	const save = useSaveEmailRecipients();
	const [form, setForm] = useState<Recipients | null>(null);

	const values = form ?? data;

	function set(key: keyof Recipients, value: string) {
		setForm((prev) => ({ ...(prev ?? data!), [key]: value }));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!values) return;
		await save.mutateAsync(values);
		setForm(null);
	}

	if (isLoading || !values) {
		return (
			<div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
				<Loader2 className="size-4 animate-spin" /> Loading…
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Import notification recipients */}
			<div className="space-y-4">
				<div>
					<h3 className="text-sm font-medium">
						Import notifications
					</h3>
					<p className="text-muted-foreground mt-0.5 text-xs">
						When a new Zenoti order is imported, an email is sent to
						the address below based on the supplier type.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					{FIELDS.map(({ key, label, description, required }) => (
						<div key={key} className="space-y-1.5">
							<Label htmlFor={key} className="text-sm">
								{label}
								{required && (
									<span className="text-destructive ml-0.5">
										*
									</span>
								)}
							</Label>
							<p className="text-muted-foreground text-xs">
								{description}
							</p>
							<Input
								id={key}
								type="email"
								value={values[key]}
								onChange={(e) => set(key, e.target.value)}
								placeholder="email@example.com"
								required={required}
							/>
						</div>
					))}
				</div>
			</div>

			<Separator />

			{/* Packing list recipients */}
			<div className="space-y-4">
				<div>
					<h3 className="text-sm font-medium">Packing list email</h3>
					<p className="text-muted-foreground mt-0.5 text-xs">
						When a fulfillment is submitted, the PDF + Excel packing
						list is emailed to these addresses.
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label
							htmlFor="zenoti_email_packing_list_to"
							className="text-sm"
						>
							To
							<span className="text-destructive ml-0.5">*</span>
						</Label>
						<Input
							id="zenoti_email_packing_list_to"
							type="email"
							value={values.zenoti_email_packing_list_to}
							onChange={(e) =>
								set(
									'zenoti_email_packing_list_to',
									e.target.value
								)
							}
							placeholder="accounting@example.com"
							required
						/>
					</div>
					<div className="space-y-1.5">
						<Label
							htmlFor="zenoti_email_packing_list_cc"
							className="text-sm"
						>
							CC{' '}
							<span className="text-muted-foreground font-normal">
								(optional)
							</span>
						</Label>
						<Input
							id="zenoti_email_packing_list_cc"
							type="email"
							value={values.zenoti_email_packing_list_cc}
							onChange={(e) =>
								set(
									'zenoti_email_packing_list_cc',
									e.target.value
								)
							}
							placeholder="orders@example.com"
						/>
					</div>
				</div>
			</div>

			<Separator />

			{/* Internal Use slip CC */}
			<div className="space-y-4">
				<div>
					<h3 className="text-sm font-medium">Internal use slips</h3>
					<p className="text-muted-foreground mt-0.5 text-xs">
						When internal use is logged, a slip is emailed to the
						requester. Add CC addresses (comma-separated) to keep
						inventory and accounts in the loop.
					</p>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="internal_use_cc" className="text-sm">
						CC{' '}
						<span className="text-muted-foreground font-normal">
							(optional, comma-separated)
						</span>
					</Label>
					<Input
						id="internal_use_cc"
						type="text"
						value={values.internal_use_cc}
						onChange={(e) => set('internal_use_cc', e.target.value)}
						placeholder="inventory@example.com, accounts@example.com"
					/>
				</div>
			</div>

			<Separator />

			{/* Shopify order notifications */}
			<div className="space-y-4">
				<div>
					<h3 className="text-sm font-medium">
						Shopify order notifications
					</h3>
					<p className="text-muted-foreground mt-0.5 text-xs">
						When new Shopify orders are detected on sync, an email
						summary is sent to these addresses.
					</p>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label
							htmlFor="shopify_order_notify_to"
							className="text-sm"
						>
							To
							<span className="text-destructive ml-0.5">*</span>
						</Label>
						<Input
							id="shopify_order_notify_to"
							type="email"
							value={values.shopify_order_notify_to}
							onChange={(e) =>
								set('shopify_order_notify_to', e.target.value)
							}
							placeholder="orders@example.com"
						/>
					</div>
					<div className="space-y-1.5">
						<Label
							htmlFor="shopify_order_notify_cc"
							className="text-sm"
						>
							CC{' '}
							<span className="text-muted-foreground font-normal">
								(optional, comma-separated)
							</span>
						</Label>
						<Input
							id="shopify_order_notify_cc"
							type="text"
							value={values.shopify_order_notify_cc}
							onChange={(e) =>
								set('shopify_order_notify_cc', e.target.value)
							}
							placeholder="accounts@example.com, warehouse@example.com"
						/>
					</div>
				</div>
			</div>

			<Separator />

			{/* Shopify not-stocked-in-house item notification */}
			<div className="space-y-4">
				<div>
					<h3 className="text-sm font-medium">
						Shopify non-warehoused item notification
					</h3>
					<p className="text-muted-foreground mt-0.5 text-xs">
						Sent when a packer flags a Shopify order containing
						items from a brand marked &quot;Not in-house&quot;
						(Stock Location toggle on the Brand Lead Times table)
						that need to be sourced separately.
					</p>
				</div>
				<div className="space-y-1.5 sm:max-w-xs">
					<Label
						htmlFor="shopify_non_warehoused_notify_to"
						className="text-sm"
					>
						To
						<span className="text-destructive ml-0.5">*</span>
					</Label>
					<Input
						id="shopify_non_warehoused_notify_to"
						type="email"
						value={values.shopify_non_warehoused_notify_to}
						onChange={(e) =>
							set(
								'shopify_non_warehoused_notify_to',
								e.target.value
							)
						}
						placeholder="accounting@example.com"
					/>
				</div>
			</div>

			<Separator />

			{/* Shopify packing list email */}
			<div className="space-y-4">
				<div>
					<h3 className="text-sm font-medium">
						Shopify packing list email
					</h3>
					<p className="text-muted-foreground mt-0.5 text-xs">
						When a Shopify order fulfillment is submitted, the PDF
						packing slip is emailed to these addresses.
					</p>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label
							htmlFor="shopify_packing_list_to"
							className="text-sm"
						>
							To
							<span className="text-destructive ml-0.5">*</span>
						</Label>
						<Input
							id="shopify_packing_list_to"
							type="email"
							value={values.shopify_packing_list_to}
							onChange={(e) =>
								set('shopify_packing_list_to', e.target.value)
							}
							placeholder="accounting@example.com"
							required
						/>
					</div>
					<div className="space-y-1.5">
						<Label
							htmlFor="shopify_packing_list_cc"
							className="text-sm"
						>
							CC{' '}
							<span className="text-muted-foreground font-normal">
								(optional)
							</span>
						</Label>
						<Input
							id="shopify_packing_list_cc"
							type="email"
							value={values.shopify_packing_list_cc}
							onChange={(e) =>
								set('shopify_packing_list_cc', e.target.value)
							}
							placeholder="orders@example.com"
						/>
					</div>
				</div>
			</div>

			<div className="flex justify-end border-t pt-4">
				<Button
					type="submit"
					disabled={save.isPending || !form}
					className="gap-2"
				>
					{save.isPending ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<Save className="size-4" />
					)}
					Save recipients
				</Button>
			</div>
		</form>
	);
}
