// @ts-nocheck
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Pencil, Package, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from 'recharts';
import { useProduct } from '@/hooks/use-products';
import { ProductForm } from '@/components/products/create/product-form';
import { formatNumber, cn } from '@/lib/utils';

const MONTH_NAMES = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

const TYPE_LABEL: Record<string, string> = {
	PROFESSIONAL: 'Professional',
	RETAIL: 'Retail',
	BOTH: 'Professional & Retail',
};

const MOVEMENT_COLORS: Record<string, string> = {
	IN: '#22c55e',
	OUT: '#ef4444',
	ADJUSTMENT: '#f59e0b',
	RETURN: '#3b82f6',
};

export function ProductView({ productId }: { productId: string }) {
	const { data: product, isLoading } = useProduct(productId);
	const [editOpen, setEditOpen] = useState(false);

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64 w-full" />
				<Skeleton className="h-48 w-full" />
			</div>
		);
	}

	if (!product) {
		return (
			<div className="text-muted-foreground py-16 text-center">
				Product not found.{' '}
				<Link href="/products" className="underline">
					Back to products
				</Link>
			</div>
		);
	}

	const totalStock =
		product.inventory?.reduce(
			(sum: number, i: any) => sum + i.quantity,
			0
		) ?? 0;

	// Sales chart — last 12 months sorted
	const salesData = [...(product.salesRecords ?? [])]
		.sort((a: any, b: any) =>
			a.year !== b.year ? a.year - b.year : a.month - b.month
		)
		.slice(-12)
		.map((r: any) => ({
			label: `${MONTH_NAMES[r.month - 1]} ${String(r.year).slice(2)}`,
			qty: r.quantity,
			rev: r.revenue,
		}));

	// Movement chart — last 30 days, oldest first
	const movementData = [...(product.stockMovements ?? [])]
		.slice(0, 30)
		.reverse()
		.map((m: any) => ({
			label: new Date(m.createdAt).toLocaleDateString('en-CA', {
				month: 'short',
				day: 'numeric',
			}),
			qty:
				m.type === 'OUT' ? -Math.abs(m.quantity) : Math.abs(m.quantity),
			balance: m.balanceAfter,
			type: m.type,
			color: MOVEMENT_COLORS[m.type] ?? '#94a3b8',
		}));

	return (
		<div className="space-y-6">
			{/* Top bar */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" asChild>
						<Link href="/products">
							<ArrowLeft className="size-4" />
						</Link>
					</Button>
					<div>
						<h1 className="text-2xl font-semibold">
							{product.name}
						</h1>
						<p className="text-muted-foreground mt-0.5 text-sm">
							{[product.sku, product.barcode]
								.filter(Boolean)
								.join(' · ') || 'No SKU/barcode'}
						</p>
					</div>
				</div>
				<div className="flex gap-2">
					<Badge variant={product.isActive ? 'outline' : 'secondary'}>
						{product.isActive ? 'Active' : 'Archived'}
					</Badge>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setEditOpen(true)}
						className="gap-1"
					>
						<Pencil className="size-3.5" /> Edit
					</Button>
				</div>
			</div>

			{/* Details + Image row */}
			<div className="grid gap-4 lg:grid-cols-3">
				{/* Details card */}
				<Card className="lg:col-span-1">
					<CardHeader>
						<CardTitle className="text-base">Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						{product.imageUrl ? (
							<div className="bg-muted relative mb-4 h-40 w-full overflow-hidden rounded-md border">
								<Image
									src={product.imageUrl}
									alt={product.name}
									fill
									sizes="(max-width: 1024px) 100vw, 33vw"
									className="object-contain"
								/>
							</div>
						) : (
							<div className="bg-muted/30 mb-4 flex h-28 w-full items-center justify-center rounded-md border">
								<ImageOff className="text-muted-foreground/30 size-8" />
							</div>
						)}
						<Row label="Brand" value={product.brand?.name} />
						<Separator />
						<Row label="Category" value={product.category?.name} />
						<Separator />
						<Row
							label="Type"
							value={
								TYPE_LABEL[product.productType] ??
								product.productType
							}
						/>
						<Separator />
						<Row label="Unit" value={product.unit} />
						<Separator />
						<Row
							label="Sale price (QB)"
							value={
								product.salePrice != null
									? `$${product.salePrice.toFixed(2)}`
									: '—'
							}
						/>
						<Separator />
						<Row
							label="Stock target"
							value={`${product.targetStockMonths} month${product.targetStockMonths !== 1 ? 's' : ''}`}
						/>
						{product.description && (
							<>
								<Separator />
								<div>
									<p className="text-muted-foreground mb-1">
										Description
									</p>
									<p>{product.description}</p>
								</div>
							</>
						)}
					</CardContent>
				</Card>

				{/* Stock by location */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center justify-between text-base">
							<span>Stock by Location</span>
							<span
								className={cn(
									'text-lg font-bold',
									totalStock === 0
										? 'text-destructive'
										: totalStock < 10
											? 'text-amber-600'
											: 'text-emerald-600'
								)}
							>
								{formatNumber(totalStock)} total
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						{product.inventory?.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Location</TableHead>
										<TableHead className="text-right">
											On Hand
										</TableHead>
										<TableHead className="text-right">
											Min Qty
										</TableHead>
										<TableHead className="text-right">
											Reorder Point
										</TableHead>
										<TableHead className="text-right">
											Reorder Qty
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{product.inventory.map((inv: any) => (
										<TableRow key={inv.id}>
											<TableCell className="font-medium">
												{inv.location.name}
											</TableCell>
											<TableCell
												className={cn(
													'text-right font-mono',
													inv.quantity <= 0
														? 'text-destructive font-semibold'
														: inv.quantity <=
															  inv.minQuantity
															? 'text-amber-600'
															: ''
												)}
											>
												{formatNumber(inv.quantity)}
											</TableCell>
											<TableCell className="text-muted-foreground text-right">
												{formatNumber(inv.minQuantity)}
											</TableCell>
											<TableCell className="text-muted-foreground text-right">
												{formatNumber(inv.reorderPoint)}
											</TableCell>
											<TableCell className="text-muted-foreground text-right">
												{formatNumber(inv.reorderQty)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
								<Package className="size-8 opacity-30" />
								No stock records yet.
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Charts row */}
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Sales trend */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Monthly Sales (last 12 months)
						</CardTitle>
					</CardHeader>
					<CardContent>
						{salesData.length > 0 ? (
							<ResponsiveContainer width="100%" height={200}>
								<BarChart
									data={salesData}
									margin={{
										top: 4,
										right: 4,
										left: -20,
										bottom: 0,
									}}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										className="stroke-border"
									/>
									<XAxis
										dataKey="label"
										tick={{ fontSize: 11 }}
									/>
									<YAxis
										tick={{ fontSize: 11 }}
										allowDecimals={false}
									/>
									<Tooltip
										formatter={(v: number) => [
											v,
											'Units sold',
										]}
										contentStyle={{
											background: 'hsl(var(--card))',
											border: '1px solid hsl(var(--border))',
											borderRadius: 8,
											fontSize: 12,
											color: 'hsl(var(--card-foreground))',
										}}
										labelStyle={{
											color: 'hsl(var(--card-foreground))',
										}}
										itemStyle={{
											color: 'hsl(var(--card-foreground))',
										}}
									/>
									<Bar
										dataKey="qty"
										fill="hsl(var(--chart-1))"
										radius={[3, 3, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
								No sales data available
							</div>
						)}
					</CardContent>
				</Card>

				{/* Stock movement balance */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Stock Balance (last 30 movements)
						</CardTitle>
					</CardHeader>
					<CardContent>
						{movementData.length > 0 ? (
							<ResponsiveContainer width="100%" height={200}>
								<LineChart
									data={movementData}
									margin={{
										top: 4,
										right: 4,
										left: -20,
										bottom: 0,
									}}
								>
									<CartesianGrid
										strokeDasharray="3 3"
										className="stroke-border"
									/>
									<XAxis
										dataKey="label"
										tick={{ fontSize: 11 }}
										interval="preserveStartEnd"
									/>
									<YAxis
										tick={{ fontSize: 11 }}
										allowDecimals={false}
									/>
									<Tooltip
										formatter={(v: number) => [
											v,
											'Balance after',
										]}
										contentStyle={{
											background: 'hsl(var(--card))',
											border: '1px solid hsl(var(--border))',
											borderRadius: 8,
											fontSize: 12,
											color: 'hsl(var(--card-foreground))',
										}}
										labelStyle={{
											color: 'hsl(var(--card-foreground))',
										}}
										itemStyle={{
											color: 'hsl(var(--card-foreground))',
										}}
									/>
									<Line
										type="monotone"
										dataKey="balance"
										stroke="hsl(var(--chart-2))"
										strokeWidth={2}
										dot={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
								No movement history
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Recent movements table */}
			{product.stockMovements?.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Recent Movements
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Type</TableHead>
									<TableHead className="text-right">
										Qty
									</TableHead>
									<TableHead className="text-right">
										Balance After
									</TableHead>
									<TableHead>Notes</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{product.stockMovements
									.slice(0, 20)
									.map((m: any, i: number) => (
										<TableRow key={i}>
											<TableCell className="text-muted-foreground text-sm">
												{new Date(
													m.createdAt
												).toLocaleDateString('en-CA', {
													year: 'numeric',
													month: 'short',
													day: 'numeric',
												})}
											</TableCell>
											<TableCell>
												<span
													className="rounded px-1.5 py-0.5 text-xs font-medium"
													style={{
														color:
															MOVEMENT_COLORS[
																m.type
															] ?? '#94a3b8',
														background: `${MOVEMENT_COLORS[m.type]}18`,
													}}
												>
													{m.type}
												</span>
											</TableCell>
											<TableCell
												className={cn(
													'text-right font-mono text-sm',
													m.type === 'OUT'
														? 'text-destructive'
														: 'text-emerald-600'
												)}
											>
												{m.type === 'OUT' ? '-' : '+'}
												{formatNumber(m.quantity)}
											</TableCell>
											<TableCell className="text-right font-mono text-sm">
												{formatNumber(m.balanceAfter)}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{m.notes ?? '—'}
											</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* Suppliers */}
			{product.productSuppliers?.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Suppliers</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Supplier</TableHead>
									<TableHead>Supplier SKU</TableHead>
									<TableHead className="text-right">
										Cost
									</TableHead>
									<TableHead>Preferred</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{product.productSuppliers.map((ps: any) => (
									<TableRow key={ps.id}>
										<TableCell className="font-medium">
											{ps.supplier.name}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{ps.supplierSku ?? '—'}
										</TableCell>
										<TableCell className="text-right">
											{ps.cost
												? `$${ps.cost.toFixed(2)}`
												: '—'}
										</TableCell>
										<TableCell>
											{ps.isPreferred ? (
												<Badge variant="outline">
													Preferred
												</Badge>
											) : (
												'—'
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			<ProductForm
				open={editOpen}
				onClose={() => setEditOpen(false)}
				product={product}
			/>
		</div>
	);
}

function Row({ label, value }: { label: string; value?: string | null }) {
	return (
		<div className="flex justify-between">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium">{value ?? '—'}</span>
		</div>
	);
}
