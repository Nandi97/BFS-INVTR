'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
	Plus,
	Trash2,
	Store,
	CheckCircle2,
	AlertCircle,
	RefreshCw,
	UploadCloud,
	Tag,
	Settings2,
	PackagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet';
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
	useShopifyConnectedStores,
	useDisconnectShopifyStore,
	useSyncShopifyOrdersForStore,
	useSyncShopifyInventoryForStore,
	usePushShopifyPricesForStore,
} from '@/hooks/use-shopify-stores';
import {
	useShopifyStoreRules,
	useSaveShopifyStoreRules,
	type ShopifyCatalogMode,
} from '@/hooks/use-shopify-store-rules';
import {
	useMissingShopifyProducts,
	useCreateShopifyProducts,
} from '@/hooks/use-shopify-catalog';
import { useBrands } from '@/hooks/use-brands';

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

type StockResult = {
	synced: number;
	skipped: number;
	errors: string[];
	error?: string;
	classificationSynced?: number;
	statusSynced?: number;
};

type PriceResult = {
	pricesSynced: number;
	skipped: number;
	errors: string[];
	error?: string;
};

function ResultPanel({
	result,
	label,
	countKey,
}: {
	result: {
		synced?: number;
		pricesSynced?: number;
		skipped: number;
		errors: string[];
		error?: string;
		classificationSynced?: number;
		statusSynced?: number;
	};
	label: string;
	countKey: 'synced' | 'pricesSynced';
}) {
	const count = result[countKey] ?? 0;
	return (
		<div className="space-y-1.5 text-xs">
			{result.error ? (
				<p className="text-destructive">{result.error}</p>
			) : (
				<p className="text-muted-foreground">
					<span className="text-foreground font-medium">{count}</span>{' '}
					{label} ·{' '}
					<span className="text-foreground font-medium">
						{result.skipped}
					</span>{' '}
					skipped
					{!!result.classificationSynced && (
						<>
							{' · '}
							<span className="text-foreground font-medium">
								{result.classificationSynced}
							</span>{' '}
							brand/category updated
						</>
					)}
					{!!result.statusSynced && (
						<>
							{' · '}
							<span className="text-foreground font-medium">
								{result.statusSynced}
							</span>{' '}
							status changed
						</>
					)}
				</p>
			)}
			{result.errors.length > 0 && (
				<div className="bg-destructive/10 space-y-1 rounded-md p-2">
					<p className="text-destructive font-medium">
						{result.errors.length} error
						{result.errors.length === 1 ? '' : 's'}:
					</p>
					<ul className="max-h-28 space-y-0.5 overflow-y-auto">
						{result.errors.map((e, i) => (
							<li key={i} className="text-destructive break-all">
								· {e}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

function StoreSettingsSheet({
	shop,
	open,
	onOpenChange,
}: {
	shop: string;
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const { data, isLoading } = useShopifyStoreRules(shop, open);
	const { data: brandsData } = useBrands();
	const save = useSaveShopifyStoreRules();

	const [form, setForm] = useState<{
		label: string;
		catalogMode: ShopifyCatalogMode;
		brandIds: string[];
	} | null>(null);

	useEffect(() => {
		if (open && data && !form) {
			setForm({
				label: data.label ?? '',
				catalogMode: data.catalogMode,
				brandIds: data.brandIds,
			});
		}
		if (!open) setForm(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, data]);

	const brands = brandsData ?? [];

	function toggleBrand(id: string, checked: boolean) {
		setForm((f) =>
			f
				? {
						...f,
						brandIds: checked
							? [...f.brandIds, id]
							: f.brandIds.filter((b) => b !== id),
					}
				: f
		);
	}

	async function handleSave() {
		if (!form) return;
		try {
			await save.mutateAsync({
				shop,
				label: form.label.trim() || null,
				catalogMode: form.catalogMode,
				brandIds:
					form.catalogMode === 'BRAND_FILTERED' ? form.brandIds : [],
			});
			toast.success('Store settings saved');
			onOpenChange(false);
		} catch {
			toast.error('Failed to save store settings');
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full overflow-y-auto sm:max-w-lg">
				<SheetHeader className="px-6 pt-6 pb-2">
					<SheetTitle>Store Settings</SheetTitle>
					<SheetDescription>{shop}</SheetDescription>
				</SheetHeader>

				{isLoading || !form ? (
					<p className="text-muted-foreground px-6 text-sm">
						Loading…
					</p>
				) : (
					<div className="space-y-5 px-6 pb-6">
						<div className="space-y-1.5">
							<Label htmlFor="store-label">Display name</Label>
							<Input
								id="store-label"
								placeholder={shop}
								value={form.label}
								onChange={(e) =>
									setForm((f) =>
										f ? { ...f, label: e.target.value } : f
									)
								}
							/>
							<p className="text-muted-foreground text-xs">
								Optional nickname shown instead of the raw
								domain.
							</p>
						</div>

						<div className="space-y-2">
							<Label>Catalog</Label>
							<RadioGroup
								value={form.catalogMode}
								onValueChange={(v) =>
									setForm((f) =>
										f
											? {
													...f,
													catalogMode:
														v as ShopifyCatalogMode,
												}
											: f
									)
								}
							>
								<div className="flex items-center gap-2">
									<RadioGroupItem value="ALL" id="mode-all" />
									<Label
										htmlFor="mode-all"
										className="font-normal"
									>
										All active products
									</Label>
								</div>
								<div className="flex items-center gap-2">
									<RadioGroupItem
										value="BRAND_FILTERED"
										id="mode-filtered"
									/>
									<Label
										htmlFor="mode-filtered"
										className="font-normal"
									>
										Selected brands only
									</Label>
								</div>
							</RadioGroup>
						</div>

						{form.catalogMode === 'BRAND_FILTERED' && (
							<div className="space-y-2">
								<Label>Brands carried by this store</Label>
								<ScrollArea className="h-56 rounded-md border p-3">
									<div className="space-y-2">
										{brands.map((b) => (
											<div
												key={b.id}
												className="flex items-center gap-2"
											>
												<Checkbox
													id={`brand-${b.id}`}
													checked={form.brandIds.includes(
														b.id
													)}
													onCheckedChange={(c) =>
														toggleBrand(
															b.id,
															c === true
														)
													}
												/>
												<Label
													htmlFor={`brand-${b.id}`}
													className="font-normal"
												>
													{b.name}
												</Label>
											</div>
										))}
									</div>
								</ScrollArea>
							</div>
						)}

						<div className="flex justify-end gap-3 border-t pt-5">
							<Button
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={handleSave}
								disabled={save.isPending}
							>
								{save.isPending ? 'Saving…' : 'Save'}
							</Button>
						</div>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}

function PushProductsSheet({
	shop,
	open,
	onOpenChange,
}: {
	shop: string;
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const { data, isLoading, isFetching } = useMissingShopifyProducts(
		shop,
		open
	);
	const createProducts = useCreateShopifyProducts();

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [prices, setPrices] = useState<Record<string, string>>({});
	const [result, setResult] = useState<{
		created: number;
		errors: string[];
	} | null>(null);

	useEffect(() => {
		if (!open) {
			setSelected(new Set());
			setPrices({});
			setResult(null);
		}
	}, [open]);

	const candidates = data?.candidates ?? [];

	function priceFor(productId: string, salePrice: number | null) {
		return (
			prices[productId] ?? (salePrice != null ? String(salePrice) : '')
		);
	}

	function toggle(productId: string, checked: boolean) {
		setSelected((s) => {
			const next = new Set(s);
			if (checked) next.add(productId);
			else next.delete(productId);
			return next;
		});
	}

	async function handleCreate() {
		const items = candidates
			.filter((c) => selected.has(c.productId))
			.map((c) => ({
				productId: c.productId,
				price: Number(priceFor(c.productId, c.salePrice)),
			}))
			.filter((i) => i.price > 0);

		if (items.length === 0) {
			toast.error('Select at least one product with a valid price');
			return;
		}

		try {
			const r = await createProducts.mutateAsync({ shop, items });
			setResult(r);
			setSelected(new Set());
			if (r.errors.length > 0) {
				toast.warning(
					`${r.created} created, ${r.errors.length} error(s)`
				);
			} else {
				toast.success(`${r.created} product(s) created on ${shop}`);
			}
		} catch {
			toast.error('Failed to create products');
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex w-full flex-col sm:max-w-2xl">
				<SheetHeader className="shrink-0 px-6 pt-6 pb-2">
					<SheetTitle>Push Products</SheetTitle>
					<SheetDescription>
						BFS products eligible for {shop} that aren&apos;t listed
						there yet.
					</SheetDescription>
				</SheetHeader>

				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6">
					{isLoading ? (
						<p className="text-muted-foreground text-sm">
							Loading…
						</p>
					) : (
						<>
							{data && (
								<p className="text-muted-foreground text-xs">
									<span className="text-foreground font-medium">
										{data.reconciled}
									</span>{' '}
									already-listed product(s) linked
									automatically ·{' '}
									<span className="text-foreground font-medium">
										{candidates.length}
									</span>{' '}
									need review
								</p>
							)}

							{candidates.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									Nothing to create — every eligible product
									is already listed on this store.
								</p>
							) : (
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-8" />
												<TableHead>Product</TableHead>
												<TableHead className="w-28">
													Price
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{candidates.map((c) => (
												<TableRow key={c.productId}>
													<TableCell>
														<Checkbox
															checked={selected.has(
																c.productId
															)}
															onCheckedChange={(
																v
															) =>
																toggle(
																	c.productId,
																	v === true
																)
															}
														/>
													</TableCell>
													<TableCell className="max-w-0 whitespace-normal">
														<p className="text-sm font-medium break-words">
															{c.name}
														</p>
														<p className="text-muted-foreground text-xs break-words">
															{c.brand ?? '—'}
														</p>
														<p className="text-muted-foreground text-xs break-words">
															{c.sku ??
																c.barcode ??
																'—'}
														</p>
													</TableCell>
													<TableCell>
														<Input
															type="number"
															step="0.01"
															className="h-8 w-24"
															value={priceFor(
																c.productId,
																c.salePrice
															)}
															onChange={(e) =>
																setPrices(
																	(p) => ({
																		...p,
																		[c.productId]:
																			e
																				.target
																				.value,
																	})
																)
															}
														/>
														{c.needsPrice && (
															<Badge
																variant="outline"
																className="mt-1 text-[10px]"
															>
																Needs price
															</Badge>
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</>
					)}

					{result && (
						<div className="space-y-1.5 text-xs">
							<p className="text-muted-foreground">
								<span className="text-foreground font-medium">
									{result.created}
								</span>{' '}
								created
							</p>
							{result.errors.length > 0 && (
								<div className="bg-destructive/10 space-y-1 rounded-md p-2">
									<ul className="max-h-28 space-y-0.5 overflow-y-auto">
										{result.errors.map((e, i) => (
											<li
												key={i}
												className="text-destructive break-all"
											>
												· {e}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}
				</div>

				<div className="flex shrink-0 justify-end gap-3 border-t px-6 py-4">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
					<Button
						onClick={handleCreate}
						disabled={
							createProducts.isPending ||
							isFetching ||
							selected.size === 0
						}
					>
						{createProducts.isPending
							? 'Creating…'
							: `Create Selected (${selected.size})`}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function StoreRow({
	shop,
	label,
	connectedAt,
}: {
	shop: string;
	label: string | null;
	connectedAt: string;
}) {
	const disconnect = useDisconnectShopifyStore();
	const syncOrders = useSyncShopifyOrdersForStore();
	const syncInventory = useSyncShopifyInventoryForStore();
	const pushPrices = usePushShopifyPricesForStore();
	const [stockResult, setStockResult] = useState<StockResult | null>(null);
	const [priceResult, setPriceResult] = useState<PriceResult | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [pushProductsOpen, setPushProductsOpen] = useState(false);

	async function handleDisconnect() {
		try {
			await disconnect.mutateAsync(shop);
			toast.success(`Disconnected ${shop}`);
		} catch {
			toast.error('Failed to disconnect store');
		}
	}

	async function handleSyncOrders() {
		try {
			const result = await syncOrders.mutateAsync(shop);
			const r = result.stores[shop];
			if (r?.error) toast.error(`${shop}: ${r.error}`);
			else toast.success(`${shop}: ${r?.created ?? 0} new orders`);
		} catch {
			toast.error('Order sync failed');
		}
	}

	async function handlePushStock() {
		setStockResult(null);
		try {
			const result = await syncInventory.mutateAsync(shop);
			const r = result.stores?.[shop] as StockResult | undefined;
			if (r) setStockResult(r);
			if (r?.error) toast.error(`Stock push failed: ${r.error}`);
			else if (r?.errors?.length)
				toast.warning(
					`${r.errors.length} SKU error(s) — see details below`
				);
			else toast.success(`${r?.synced ?? 0} quantities pushed`);
		} catch {
			toast.error('Inventory push failed');
		}
	}

	async function handlePushPrices() {
		setPriceResult(null);
		try {
			const result = await pushPrices.mutateAsync(shop);
			const r = result.stores?.[shop] as PriceResult | undefined;
			if (r) setPriceResult(r);
			if (r?.error) toast.error(`Price push failed: ${r.error}`);
			else if (r?.errors?.length)
				toast.warning(
					`${r.errors.length} price error(s) — see details below`
				);
			else toast.success(`${r?.pricesSynced ?? 0} prices pushed`);
		} catch {
			toast.error('Price push failed');
		}
	}

	const anyPending =
		syncInventory.isPending || pushPrices.isPending || syncOrders.isPending;

	return (
		<div className="rounded-lg border px-4 py-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Store className="text-muted-foreground size-4 shrink-0" />
					<div>
						<p className="text-sm font-medium">{label || shop}</p>
						{label && (
							<p className="text-muted-foreground text-xs">
								{shop}
							</p>
						)}
						<p className="text-muted-foreground text-xs">
							Connected{' '}
							{format(
								new Date(connectedAt),
								'MMM d, yyyy · h:mm a'
							)}
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
									Order sync and inventory push will stop for
									this store. The token will be removed from
									BFS. You can reconnect anytime.
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

			<div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
				<Button
					variant="outline"
					size="sm"
					onClick={handleSyncOrders}
					disabled={anyPending}
				>
					<RefreshCw
						className={`mr-1.5 size-3.5 ${syncOrders.isPending ? 'animate-spin' : ''}`}
					/>
					{syncOrders.isPending ? 'Syncing…' : 'Sync Orders'}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handlePushStock}
					disabled={anyPending}
				>
					<UploadCloud
						className={`mr-1.5 size-3.5 ${syncInventory.isPending ? 'animate-pulse' : ''}`}
					/>
					{syncInventory.isPending ? 'Pushing…' : 'Push Stock'}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handlePushPrices}
					disabled={anyPending}
				>
					<Tag
						className={`mr-1.5 size-3.5 ${pushPrices.isPending ? 'animate-pulse' : ''}`}
					/>
					{pushPrices.isPending ? 'Pushing…' : 'Push Prices'}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setPushProductsOpen(true)}
				>
					<PackagePlus className="mr-1.5 size-3.5" />
					Push Products
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setSettingsOpen(true)}
				>
					<Settings2 className="mr-1.5 size-3.5" />
					Store Settings
				</Button>
			</div>

			{(stockResult && !syncInventory.isPending) ||
			(priceResult && !pushPrices.isPending) ? (
				<div className="mt-3 space-y-2 border-t pt-3">
					{stockResult && !syncInventory.isPending && (
						<ResultPanel
							result={stockResult}
							label="quantities pushed"
							countKey="synced"
						/>
					)}
					{priceResult && !pushPrices.isPending && (
						<ResultPanel
							result={priceResult}
							label="prices pushed"
							countKey="pricesSynced"
						/>
					)}
				</div>
			) : null}

			<StoreSettingsSheet
				shop={shop}
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
			/>
			<PushProductsSheet
				shop={shop}
				open={pushProductsOpen}
				onOpenChange={setPushProductsOpen}
			/>
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
							label={s.label}
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
