'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Plus, Trash2, Store, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
	useShopifyConnectedStores,
	useDisconnectShopifyStore,
} from '@/hooks/use-shopify-stores';

function ConnectForm() {
	const [shop, setShop] = useState('');

	function handleConnect() {
		const domain = shop
			.trim()
			.replace(/^https?:\/\//, '')
			.replace(/\/$/, '');
		if (!domain) return;
		window.location.href = `/api/integrations/shopify/connect?shop=${encodeURIComponent(domain)}`;
	}

	return (
		<div className="space-y-3">
			<div className="space-y-1.5">
				<Label htmlFor="shop-domain">Store domain</Label>
				<div className="flex gap-2">
					<Input
						id="shop-domain"
						placeholder="your-store.myshopify.com"
						value={shop}
						onChange={(e) => setShop(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
						className="max-w-xs"
					/>
					<Button
						size="sm"
						onClick={handleConnect}
						disabled={!shop.trim()}
					>
						<Plus className="mr-1.5 size-3.5" />
						Connect
					</Button>
				</div>
				<p className="text-muted-foreground text-xs">
					Enter the .myshopify.com domain, e.g.{' '}
					<code>beauty-first-spa-wholesale.myshopify.com</code>
				</p>
			</div>
		</div>
	);
}

function StoreRow({
	shop,
	connectedAt,
}: {
	shop: string;
	connectedAt: string;
}) {
	const disconnect = useDisconnectShopifyStore();

	async function handleDisconnect() {
		try {
			await disconnect.mutateAsync(shop);
			toast.success(`Disconnected ${shop}`);
		} catch {
			toast.error('Failed to disconnect store');
		}
	}

	return (
		<div className="flex items-center justify-between rounded-lg border px-4 py-3">
			<div className="flex items-center gap-3">
				<Store className="text-muted-foreground size-4 shrink-0" />
				<div>
					<p className="text-sm font-medium">{shop}</p>
					<p className="text-muted-foreground text-xs">
						Connected{' '}
						{format(new Date(connectedAt), 'MMM d, yyyy · h:mm a')}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<CheckCircle2 className="size-4 text-emerald-500" />
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-7 text-red-500 hover:text-red-600"
						>
							<Trash2 className="size-3.5" />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Disconnect {shop}?
							</AlertDialogTitle>
							<AlertDialogDescription>
								Order sync and inventory push will stop for this
								store. The token will be removed from BFS. You
								can reconnect anytime.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								className="bg-red-600 hover:bg-red-700"
								onClick={handleDisconnect}
							>
								Disconnect
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}

export function ShopifyConnect() {
	const { data, isLoading } = useShopifyConnectedStores();
	const searchParams = useSearchParams();
	const router = useRouter();

	useEffect(() => {
		const connected = searchParams.get('shopify_connected');
		const error = searchParams.get('shopify_error');
		if (connected) {
			toast.success(`Connected ${decodeURIComponent(connected)}`);
			router.replace('/integrations?tab=shopify');
		} else if (error) {
			toast.error(`Shopify connect failed: ${decodeURIComponent(error)}`);
			router.replace('/integrations?tab=shopify');
		}
	}, [searchParams, router]);

	const stores = data?.stores ?? [];

	return (
		<div className="space-y-4">
			{isLoading ? (
				<p className="text-muted-foreground text-sm">Loading…</p>
			) : stores.length === 0 ? (
				<div className="flex items-center gap-2 rounded-lg border border-dashed p-4">
					<AlertCircle className="text-muted-foreground size-4 shrink-0" />
					<p className="text-muted-foreground text-sm">
						No Shopify stores connected yet.
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{stores.map((s) => (
						<StoreRow
							key={s.shop}
							shop={s.shop}
							connectedAt={s.connectedAt}
						/>
					))}
				</div>
			)}

			<div className="border-t pt-4">
				<p className="mb-3 text-sm font-medium">Connect a store</p>
				<ConnectForm />
			</div>
		</div>
	);
}
