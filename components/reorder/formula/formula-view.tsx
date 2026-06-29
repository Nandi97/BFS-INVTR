import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import Link from 'next/link';

function FormulaBlock({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-muted/60 rounded-md px-4 py-3 font-mono text-sm leading-relaxed">
			{children}
		</div>
	);
}

function LiveBadge() {
	return (
		<Badge
			variant="secondary"
			className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
		>
			live
		</Badge>
	);
}

function StoredBadge() {
	return (
		<Badge
			variant="secondary"
			className="shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
		>
			stored
		</Badge>
	);
}

function ConfigBadge() {
	return (
		<Badge
			variant="secondary"
			className="shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
		>
			configured
		</Badge>
	);
}

function ConstantBadge() {
	return (
		<Badge variant="outline" className="shrink-0">
			constant
		</Badge>
	);
}

export function FormulaView() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">
					Reorder Formula Reference
				</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					How the system calculates when to reorder and how much to
					order for each product.
				</p>
			</div>

			{/* Badge legend */}
			<div className="flex flex-wrap items-center gap-3 text-sm">
				<span className="text-muted-foreground">Key:</span>
				<span className="flex items-center gap-1.5">
					<LiveBadge /> computed fresh every page load from sales data
				</span>
				<span className="flex items-center gap-1.5">
					<StoredBadge /> written to DB by the Recalculate button;
					used as fallback
				</span>
				<span className="flex items-center gap-1.5">
					<ConfigBadge /> set by an admin in Settings
				</span>
				<span className="flex items-center gap-1.5">
					<ConstantBadge /> hardcoded in{' '}
					<code className="text-xs">lib/sales-calc.ts</code>
				</span>
			</div>

			{/* avgMonthly */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-3">
						<div>
							<CardTitle className="text-base">
								avgMonthly — weighted average monthly sales
							</CardTitle>
							<CardDescription className="mt-1">
								Foundation of every other calculation. Derived
								from the last 12 months of sales records.
							</CardDescription>
						</div>
						<LiveBadge />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<p className="text-sm font-medium">
							Step 1 — trailing-zero trim
						</p>
						<FormulaBlock>
							<span className="text-muted-foreground">
								{
									'// Strip leading zeros from the desc-sorted array'
								}
							</span>
							<br />
							<span>
								records = records sorted DESC (most recent
								first)
							</span>
							<br />
							<span>
								trimmed = records.slice(firstNonZeroIndex)
							</span>
						</FormulaBlock>
						<p className="text-muted-foreground text-sm">
							If the most recent months show zero sales, those are
							stripped before averaging. This handles products on
							hold (legal clearance, distribution pause) without
							diluting the historical demand signal. Zeros{' '}
							<em>inside</em> the window are kept — sporadic
							products genuinely don't sell every month.
						</p>
					</div>

					<Separator />

					<div className="space-y-2">
						<p className="text-sm font-medium">
							Step 2 — linear recency weighting
						</p>
						<FormulaBlock>
							n = trimmed.length
							<br />
							weight[i] = n − i &nbsp;&nbsp;&nbsp;&nbsp;
							<span className="text-muted-foreground">
								{
									'// index 0 (most recent) → weight n; oldest → weight 1'
								}
							</span>
							<br />
							avgMonthly = Σ(quantity[i] × weight[i]) /
							Σ(weight[i])
						</FormulaBlock>
						<p className="text-muted-foreground text-sm">
							A product trending up scores higher than a flat
							average; a product trending down scores lower. This
							makes reorder suggestions directionally correct even
							mid-trend.
						</p>
					</div>

					<Separator />

					<div className="space-y-2">
						<p className="text-sm font-medium">Confidence flag</p>
						<FormulaBlock>
							confident = (non-zero months in trimmed window &gt;=
							3)
						</FormulaBlock>
						<p className="text-muted-foreground text-sm">
							When{' '}
							<code className="text-xs">confident = false</code>,
							the Reorder page shows the suggested quantity as{' '}
							<code className="text-xs">~N</code> in grey with a
							tooltip. Fewer than 3 non-zero months means the
							estimate is too thin to act on without review.
						</p>
					</div>

					<Alert className="mt-2">
						<Info className="size-4" />
						<AlertDescription className="text-sm">
							<strong>Data source:</strong>{' '}
							<code className="text-xs">SalesRecord</code> table —
							last 12 months, ordered DESC. Populated by the QB
							Sales CSV import or the QB Sales API sync (when the
							QB user has Reports access). Currently the 12 months
							of bootstrapped data (Apr 2025–Mar 2026) is the
							active window.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>

			{/* reorderPoint */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-3">
						<div>
							<CardTitle className="text-base">
								reorderPoint — when to trigger an order
							</CardTitle>
							<CardDescription className="mt-1">
								The stock level below which a purchase order
								should be raised. Shown as the threshold on the
								Reorder page.
							</CardDescription>
						</div>
						<LiveBadge />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<FormulaBlock>
						reorderPoint = ceil( avgMonthly × (leadTimeDays +
						SAFETY_DAYS) / 30 )
					</FormulaBlock>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<div className="space-y-1 rounded-md border p-3">
							<div className="flex items-center justify-between">
								<code className="text-xs font-medium">
									avgMonthly
								</code>
								<LiveBadge />
							</div>
							<p className="text-muted-foreground text-xs">
								Weighted average units sold per month (see
								above).
							</p>
						</div>
						<div className="space-y-1 rounded-md border p-3">
							<div className="flex items-center justify-between">
								<code className="text-xs font-medium">
									leadTimeDays
								</code>
								<ConfigBadge />
							</div>
							<p className="text-muted-foreground text-xs">
								Days from order to delivery. Set per brand in{' '}
								<Link
									href="/settings"
									className="text-primary underline-offset-2 hover:underline"
								>
									Settings → Brand Lead Times
								</Link>
								. Local: 14 d. International: 45 d.
							</p>
						</div>
						<div className="space-y-1 rounded-md border p-3">
							<div className="flex items-center justify-between">
								<code className="text-xs font-medium">
									SAFETY_DAYS
								</code>
								<ConstantBadge />
							</div>
							<p className="text-muted-foreground text-xs">
								Fixed 7-day buffer. Defined in{' '}
								<code className="text-xs">
									lib/sales-calc.ts
								</code>
								.
							</p>
						</div>
					</div>

					<Alert>
						<Info className="size-4" />
						<AlertDescription className="text-sm">
							<strong>Live vs stored:</strong> The Reorder page
							always computes this live — changing a brand's lead
							time is reflected immediately without running
							Recalculate. The stored{' '}
							<code className="text-xs">
								inventory.reorderPoint
							</code>{' '}
							value is only used as a fallback when{' '}
							<code className="text-xs">avgMonthly = 0</code> (no
							sales data). It also drives the stock-level
							threshold shown on the Stock Overview page.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>

			{/* minQuantity */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-3">
						<div>
							<CardTitle className="text-base">
								minQuantity — 1-week safety buffer
							</CardTitle>
							<CardDescription className="mt-1">
								The absolute floor: stock needed to cover demand
								during a 1-week emergency window even if supply
								has already failed.
							</CardDescription>
						</div>
						<StoredBadge />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<FormulaBlock>
						minQuantity = ceil( avgMonthly × SAFETY_DAYS / 30 )
					</FormulaBlock>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="space-y-1 rounded-md border p-3">
							<div className="flex items-center justify-between">
								<code className="text-xs font-medium">
									avgMonthly
								</code>
								<LiveBadge />
							</div>
							<p className="text-muted-foreground text-xs">
								Same weighted average used elsewhere.
							</p>
						</div>
						<div className="space-y-1 rounded-md border p-3">
							<div className="flex items-center justify-between">
								<code className="text-xs font-medium">
									SAFETY_DAYS = 7
								</code>
								<ConstantBadge />
							</div>
							<p className="text-muted-foreground text-xs">
								One week. Shared constant with reorderPoint.
							</p>
						</div>
					</div>

					<Alert>
						<Info className="size-4" />
						<AlertDescription className="text-sm">
							<strong>Stored only.</strong> Written to{' '}
							<code className="text-xs">
								inventory.minQuantity
							</code>{' '}
							by the Recalculate button. Not recomputed live on
							any page — run Recalculate after meaningful sales
							data changes to keep it current.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>

			{/* reorderQty */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-3">
						<div>
							<CardTitle className="text-base">
								reorderQty — suggested order quantity
							</CardTitle>
							<CardDescription className="mt-1">
								How many units to order to reach the target
								stock level. Shown as "Suggested Qty" on the
								Reorder page.
							</CardDescription>
						</div>
						<LiveBadge />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<FormulaBlock>
						reorderQty = ceil( avgMonthly × targetStockMonths )
					</FormulaBlock>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="space-y-1 rounded-md border p-3">
							<div className="flex items-center justify-between">
								<code className="text-xs font-medium">
									avgMonthly
								</code>
								<LiveBadge />
							</div>
							<p className="text-muted-foreground text-xs">
								Same weighted average used elsewhere.
							</p>
						</div>
						<div className="space-y-1 rounded-md border p-3">
							<div className="flex items-center justify-between">
								<code className="text-xs font-medium">
									targetStockMonths
								</code>
								<ConfigBadge />
							</div>
							<p className="text-muted-foreground text-xs">
								Per-product setting in{' '}
								<Link
									href="/settings"
									className="text-primary underline-offset-2 hover:underline"
								>
									Settings → Stock Policy
								</Link>
								. Local brands: 2 mo. International default: 6
								mo.
							</p>
						</div>
					</div>

					<Alert>
						<Info className="size-4" />
						<AlertDescription className="text-sm">
							<strong>Live on Reorder page.</strong> The{' '}
							<code className="text-xs">suggestedOrderQty</code>{' '}
							column is always computed live. The stored{' '}
							<code className="text-xs">
								inventory.reorderQty
							</code>{' '}
							is written by Recalculate and used only as a
							fallback when{' '}
							<code className="text-xs">avgMonthly = 0</code>.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>

			{/* Full input map */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">
						All inputs at a glance
					</CardTitle>
					<CardDescription>
						Every variable the formulas depend on, where it lives,
						and whether it requires action before the numbers are
						meaningful.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Input</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Where it lives</TableHead>
									<TableHead>Requires action?</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow>
									<TableCell>
										<code className="text-xs">
											SalesRecord.quantity
										</code>
									</TableCell>
									<TableCell>
										<LiveBadge />
									</TableCell>
									<TableCell className="text-sm">
										DB table — last 12 months fetched at
										query time
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										Keep sales data current via QB CSV
										import
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>
										<code className="text-xs">
											brand.leadTimeDays
										</code>
									</TableCell>
									<TableCell>
										<ConfigBadge />
									</TableCell>
									<TableCell className="text-sm">
										<code className="text-xs">Brand</code>{' '}
										table — set in Settings → Brand Lead
										Times
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										Must be set per brand; default fallback
										is 30 days
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>
										<code className="text-xs">
											product.targetStockMonths
										</code>
									</TableCell>
									<TableCell>
										<ConfigBadge />
									</TableCell>
									<TableCell className="text-sm">
										<code className="text-xs">Product</code>{' '}
										table — set in Settings → Stock Policy
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										Default 6 months if not set; local
										brands should be 2
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>
										<code className="text-xs">
											SAFETY_DAYS
										</code>
									</TableCell>
									<TableCell>
										<ConstantBadge />
									</TableCell>
									<TableCell className="text-sm">
										<code className="text-xs">
											lib/sales-calc.ts
										</code>{' '}
										— exported constant
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										Change in code; currently 7 days
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>
										<code className="text-xs">
											inventory.reorderPoint
										</code>
									</TableCell>
									<TableCell>
										<StoredBadge />
									</TableCell>
									<TableCell className="text-sm">
										<code className="text-xs">
											Inventory
										</code>{' '}
										table — written by Recalculate
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										Fallback only (when no sales data); run
										Recalculate to refresh
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>
										<code className="text-xs">
											inventory.minQuantity
										</code>
									</TableCell>
									<TableCell>
										<StoredBadge />
									</TableCell>
									<TableCell className="text-sm">
										<code className="text-xs">
											Inventory
										</code>{' '}
										table — written by Recalculate
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										Used by Stock Overview alerts; run
										Recalculate to refresh
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>
										<code className="text-xs">
											inventory.reorderQty
										</code>
									</TableCell>
									<TableCell>
										<StoredBadge />
									</TableCell>
									<TableCell className="text-sm">
										<code className="text-xs">
											Inventory
										</code>{' '}
										table — written by Recalculate
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										Fallback only (when no sales data); run
										Recalculate to refresh
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* When to run Recalculate */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">
						When to run Recalculate
					</CardTitle>
					<CardDescription>
						The Recalculate button is in{' '}
						<Link
							href="/settings"
							className="text-primary underline-offset-2 hover:underline"
						>
							Settings → Stock Policy
						</Link>
						. It calls{' '}
						<code className="text-xs">
							POST /api/inventory/calculate-minimums
						</code>{' '}
						and writes all three stored values for every active
						product that has sales data.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="space-y-2">
							<p className="text-sm font-semibold">
								Run Recalculate when:
							</p>
							<ul className="text-muted-foreground list-disc space-y-1.5 pl-4 text-sm">
								<li>
									New sales data is imported (QB CSV) that
									significantly shifts demand patterns
								</li>
								<li>
									<code className="text-xs">
										targetStockMonths
									</code>{' '}
									is changed in Stock Policy (stored{' '}
									<code className="text-xs">reorderQty</code>{' '}
									goes stale immediately)
								</li>
								<li>
									You want the Stock Overview page thresholds
									(which read{' '}
									<code className="text-xs">minQuantity</code>
									) to reflect current demand
								</li>
								<li>
									New products are added and their first sales
									data arrives
								</li>
							</ul>
						</div>
						<div className="space-y-2">
							<p className="text-sm font-semibold">
								No need to run when:
							</p>
							<ul className="text-muted-foreground list-disc space-y-1.5 pl-4 text-sm">
								<li>
									You change a brand's{' '}
									<code className="text-xs">
										leadTimeDays
									</code>{' '}
									— the Reorder page picks this up live
									without a stored value
								</li>
								<li>
									You just want to see the latest suggested
									quantities — the Reorder page always
									computes them fresh
								</li>
								<li>
									Day-to-day stock movements happen — those
									don't affect sales averages
								</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* urgency classification */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">
						Urgency classification
					</CardTitle>
					<CardDescription>
						How each row on the Reorder page gets its status chip.
						All computed live.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Status</TableHead>
									<TableHead>Condition</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								<TableRow>
									<TableCell>
										<Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
											out of stock
										</Badge>
									</TableCell>
									<TableCell className="font-mono text-xs">
										quantity &lt;= 0
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>
										<Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
											urgent
										</Badge>
									</TableCell>
									<TableCell className="font-mono text-xs">
										quantity &lt;= reorderPoint (and
										quantity &gt; 0)
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>
										<Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
											low
										</Badge>
									</TableCell>
									<TableCell className="font-mono text-xs">
										monthsRemaining &lt;= targetStockMonths
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>
										<Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
											ok
										</Badge>
									</TableCell>
									<TableCell className="font-mono text-xs">
										none of the above (not shown by default)
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
					<p className="text-muted-foreground mt-3 text-sm">
						<code className="text-xs">
							monthsRemaining = quantity / avgMonthly
						</code>
						. The Reorder page default filter hides{' '}
						<strong>ok</strong> rows — use the Urgency filter to
						show all products.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
