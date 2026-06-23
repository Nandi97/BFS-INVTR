'use client';

import { useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SuppliersTable } from './suppliers-table';
import { SupplierForm } from '@/components/suppliers/create/supplier-form';
import { useSuppliers } from '@/hooks/use-suppliers';

export function SuppliersDashboard() {
	const [formOpen, setFormOpen] = useState(false);
	const { data } = useSuppliers({ limit: 1 });
	const hasSuppliers = (data?.total ?? 0) > 0;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Suppliers
					</h1>
					<p className="text-muted-foreground mt-0.5 text-sm">
						Manage vendors, contacts, and lead times
					</p>
				</div>
				<Button onClick={() => setFormOpen(true)}>
					<Plus className="mr-2 size-4" />
					Add Supplier
				</Button>
			</div>

			{!hasSuppliers && data !== undefined ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
					<Truck className="text-muted-foreground mb-4 size-10" />
					<p className="text-sm font-medium">No suppliers yet</p>
					<p className="text-muted-foreground mt-1 max-w-xs text-xs">
						Add your suppliers to link them to products and generate
						purchase orders.
					</p>
					<Button className="mt-4" onClick={() => setFormOpen(true)}>
						<Plus className="mr-2 size-4" />
						Add First Supplier
					</Button>
				</div>
			) : (
				<SuppliersTable />
			)}

			<SupplierForm open={formOpen} onOpenChange={setFormOpen} />
		</div>
	);
}
