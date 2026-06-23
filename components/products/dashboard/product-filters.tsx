'use client';

import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useBrands } from '@/hooks/use-brands';
import { useCategories } from '@/hooks/use-categories';
import type { ProductFilters } from '@/hooks/use-products';

interface ProductFiltersProps {
	filters: ProductFilters;
	onChange: (f: Partial<ProductFilters>) => void;
	onReset: () => void;
}

export function ProductFiltersBar({
	filters,
	onChange,
	onReset,
}: ProductFiltersProps) {
	const { data: brands = [] } = useBrands();
	const { data: categories = [] } = useCategories();
	const searchRef = useRef<HTMLInputElement>(null);

	// Debounce search
	useEffect(() => {
		const t = setTimeout(() => {
			if (
				searchRef.current &&
				searchRef.current.value !== (filters.search ?? '')
			) {
				onChange({ search: searchRef.current.value, page: 1 });
			}
		}, 300);
		return () => clearTimeout(t);
	});

	const hasFilters = !!(
		filters.search ||
		filters.brandId ||
		filters.categoryId ||
		filters.productType ||
		filters.isActive !== undefined
	);

	return (
		<div className="flex flex-wrap items-center gap-2">
			{/* Search */}
			<div className="relative min-w-48 flex-1">
				<Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
				<Input
					ref={searchRef}
					defaultValue={filters.search ?? ''}
					placeholder="Search name, SKU, barcode…"
					className="pl-8"
					onChange={(e) =>
						onChange({ search: e.target.value, page: 1 })
					}
				/>
			</div>

			{/* Brand */}
			<Select
				value={filters.brandId ?? 'all'}
				onValueChange={(v) =>
					onChange({ brandId: v === 'all' ? undefined : v, page: 1 })
				}
			>
				<SelectTrigger className="w-40">
					<SelectValue placeholder="All brands" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All brands</SelectItem>
					{brands.map((b: any) => (
						<SelectItem key={b.id} value={b.id}>
							{b.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Category */}
			<Select
				value={filters.categoryId ?? 'all'}
				onValueChange={(v) =>
					onChange({
						categoryId: v === 'all' ? undefined : v,
						page: 1,
					})
				}
			>
				<SelectTrigger className="w-44">
					<SelectValue placeholder="All categories" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All categories</SelectItem>
					{categories.map((c: any) => (
						<SelectItem key={c.id} value={c.id}>
							{c.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Type */}
			<Select
				value={filters.productType ?? 'all'}
				onValueChange={(v) =>
					onChange({
						productType: v === 'all' ? undefined : v,
						page: 1,
					})
				}
			>
				<SelectTrigger className="w-36">
					<SelectValue placeholder="Type" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All types</SelectItem>
					<SelectItem value="PROFESSIONAL">Professional</SelectItem>
					<SelectItem value="RETAIL">Retail</SelectItem>
					<SelectItem value="BOTH">Both</SelectItem>
				</SelectContent>
			</Select>

			{/* Status */}
			<Select
				value={
					filters.isActive === undefined
						? 'all'
						: filters.isActive
							? 'active'
							: 'inactive'
				}
				onValueChange={(v) =>
					onChange({
						isActive: v === 'all' ? undefined : v === 'active',
						page: 1,
					})
				}
			>
				<SelectTrigger className="w-32">
					<SelectValue placeholder="Status" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All</SelectItem>
					<SelectItem value="active">Active</SelectItem>
					<SelectItem value="inactive">Archived</SelectItem>
				</SelectContent>
			</Select>

			{hasFilters && (
				<Button
					variant="ghost"
					size="sm"
					onClick={onReset}
					className="gap-1"
				>
					<X className="size-3" /> Clear
				</Button>
			)}
		</div>
	);
}
