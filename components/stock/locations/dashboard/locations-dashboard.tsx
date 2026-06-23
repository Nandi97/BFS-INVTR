'use client';

import { useState } from 'react';
import { Plus, Warehouse, Store, Cloud, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LocationForm } from '@/components/stock/locations/create/location-form';
import {
	useLocations,
	useUpdateLocation,
	useDeleteLocation,
	type Location,
} from '@/hooks/use-locations';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const LOCATION_ICONS = {
	WAREHOUSE: Warehouse,
	RETAIL: Store,
	VIRTUAL: Cloud,
};

const LOCATION_COLORS = {
	WAREHOUSE: 'text-blue-600 dark:text-blue-400',
	RETAIL: 'text-emerald-600 dark:text-emerald-400',
	VIRTUAL: 'text-purple-600 dark:text-purple-400',
};

function LocationCard({
	loc,
	onToggle,
	onDelete,
}: {
	loc: Location;
	onToggle: () => void;
	onDelete: () => void;
}) {
	const Icon = LOCATION_ICONS[loc.type];
	return (
		<Card className={cn(!loc.isActive && 'opacity-60')}>
			<CardHeader className="flex flex-row items-start justify-between pb-2">
				<div className="flex items-center gap-3">
					<div className={cn('mt-0.5', LOCATION_COLORS[loc.type])}>
						<Icon className="size-5" />
					</div>
					<div>
						<CardTitle className="text-base">{loc.name}</CardTitle>
						<CardDescription className="font-mono text-xs">
							{loc.code}
						</CardDescription>
					</div>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="-mr-2 size-7"
						>
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onToggle}>
							{loc.isActive ? 'Deactivate' : 'Activate'}
						</DropdownMenuItem>
						<DropdownMenuItem
							className="text-destructive focus:text-destructive"
							onClick={onDelete}
						>
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</CardHeader>
			<CardContent className="space-y-1.5">
				{loc.address && (
					<p className="text-muted-foreground text-xs">
						{loc.address}
					</p>
				)}
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="text-xs capitalize">
						{loc.type.toLowerCase()}
					</Badge>
					<Badge
						variant="outline"
						className={cn(
							'text-xs',
							loc.isActive
								? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
								: 'border-muted-foreground text-muted-foreground'
						)}
					>
						{loc.isActive ? 'Active' : 'Inactive'}
					</Badge>
				</div>
				{loc._count !== undefined && (
					<p className="text-muted-foreground text-xs">
						{loc._count.inventory} product
						{loc._count.inventory !== 1 ? 's' : ''} in stock
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export function LocationsDashboard() {
	const [formOpen, setFormOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

	const { data: locations, isLoading } = useLocations();
	const update = useUpdateLocation();
	const remove = useDeleteLocation();

	async function handleToggle(loc: Location) {
		try {
			await update.mutateAsync({ id: loc.id, isActive: !loc.isActive });
			toast.success(
				`${loc.name} ${loc.isActive ? 'deactivated' : 'activated'}`
			);
		} catch {
			toast.error('Failed to update location');
		}
	}

	async function handleDelete() {
		if (!deleteTarget) return;
		try {
			await remove.mutateAsync(deleteTarget.id);
			toast.success(`${deleteTarget.name} deleted`);
			setDeleteTarget(null);
		} catch (err: unknown) {
			const msg =
				err && typeof err === 'object' && 'response' in err
					? (err as { response?: { data?: { error?: string } } })
							.response?.data?.error
					: undefined;
			toast.error(msg ?? 'Failed to delete location');
			setDeleteTarget(null);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Locations
					</h1>
					<p className="text-muted-foreground mt-0.5 text-sm">
						Manage warehouses, retail locations, and virtual stock
						pools
					</p>
				</div>
				<Button onClick={() => setFormOpen(true)}>
					<Plus className="mr-2 size-4" />
					Add Location
				</Button>
			</div>

			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-40 rounded-xl" />
					))}
				</div>
			) : locations?.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
					<Warehouse className="text-muted-foreground mb-4 size-10" />
					<p className="text-sm font-medium">No locations yet</p>
					<p className="text-muted-foreground mt-1 text-xs">
						Add your first location to start tracking stock.
					</p>
					<Button className="mt-4" onClick={() => setFormOpen(true)}>
						<Plus className="mr-2 size-4" />
						Add Location
					</Button>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{locations?.map((loc) => (
						<LocationCard
							key={loc.id}
							loc={loc}
							onToggle={() => handleToggle(loc)}
							onDelete={() => setDeleteTarget(loc)}
						/>
					))}
				</div>
			)}

			<LocationForm open={formOpen} onOpenChange={setFormOpen} />

			<AlertDialog
				open={!!deleteTarget}
				onOpenChange={(o) => !o && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {deleteTarget?.name}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this location.
							Locations with stock records cannot be deleted —
							deactivate instead.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDelete}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
