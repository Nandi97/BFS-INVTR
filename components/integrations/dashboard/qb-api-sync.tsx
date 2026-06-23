'use client';

import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	useQbConfig,
	useQbApiSyncStock,
	useQbApiSyncSales,
} from '@/hooks/use-integrations';

interface Props {
	mode: 'stock' | 'sales';
}

export function QbApiSync({ mode }: Props) {
	const { data: config } = useQbConfig();
	const syncStock = useQbApiSyncStock();
	const syncSales = useQbApiSyncSales();

	const connected = config?.connected ?? false;
	if (!connected) return null;

	if (mode === 'stock') {
		return (
			<Button
				variant="outline"
				size="sm"
				disabled={syncStock.isPending}
				onClick={() =>
					syncStock.mutate(undefined, {
						onSuccess: (r) => {
							const msg = `Stock synced: ${r.synced ?? 0} updated, ${r.skipped} skipped`;
							if ((r.errors?.length ?? 0) > 0) toast.warning(msg);
							else toast.success(msg);
						},
						onError: (e) =>
							toast.error(`Sync failed: ${e.message}`),
					})
				}
			>
				<RefreshCw
					className={`mr-1.5 size-3.5 ${syncStock.isPending ? 'animate-spin' : ''}`}
				/>
				{syncStock.isPending ? 'Syncing…' : 'Sync from QuickBooks'}
			</Button>
		);
	}

	return (
		<Button
			variant="outline"
			size="sm"
			disabled={syncSales.isPending}
			onClick={() =>
				syncSales.mutate(undefined, {
					onSuccess: (r) => {
						const period = r.period
							? ` (${r.period.from} – ${r.period.to})`
							: '';
						const msg = `Sales synced: ${r.synced ?? 0} records${period}`;
						if ((r.errors?.length ?? 0) > 0) toast.warning(msg);
						else toast.success(msg);
					},
					onError: (e) => toast.error(`Sync failed: ${e.message}`),
				})
			}
		>
			<RefreshCw
				className={`mr-1.5 size-3.5 ${syncSales.isPending ? 'animate-spin' : ''}`}
			/>
			{syncSales.isPending ? 'Syncing…' : 'Sync from QuickBooks'}
		</Button>
	);
}
