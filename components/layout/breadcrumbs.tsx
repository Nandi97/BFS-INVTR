'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Fragment } from 'react';

const ROUTE_LABELS: Record<string, string> = {
	dashboard: 'Dashboard',
	products: 'Products',
	stock: 'Stock & Locations',
	movements: 'Movements Log',
	locations: 'Locations',
	reorder: 'Reorder',
	suppliers: 'Suppliers',
	'purchase-orders': 'Purchase Orders',
	notifications: 'Notifications',
	analytics: 'Analytics',
	'import-export': 'Import / Export',
	integrations: 'Integrations',
	settings: 'Settings',
	zenoti: 'Zenoti',
	pending: 'Pending from QB',
};

export function Breadcrumbs() {
	const pathname = usePathname();
	const segments = pathname.split('/').filter(Boolean);

	const crumbs = segments.map((seg, i) => {
		const href = '/' + segments.slice(0, i + 1).join('/');
		const label =
			ROUTE_LABELS[seg] ??
			seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
		const isLast = i === segments.length - 1;
		return { href, label, isLast };
	});

	if (crumbs.length <= 1) return null;

	return (
		<Breadcrumb className="min-w-0">
			<BreadcrumbList className="flex-nowrap">
				{crumbs.map((crumb, i) => (
					<Fragment key={crumb.href}>
						{/* Separator — hidden on mobile */}
						{i > 0 && (
							<BreadcrumbSeparator className="hidden sm:block" />
						)}
						<BreadcrumbItem
							className={
								!crumb.isLast ? 'hidden sm:flex' : 'min-w-0'
							}
						>
							{crumb.isLast ? (
								<BreadcrumbPage className="max-w-[14rem] truncate sm:max-w-none">
									{crumb.label}
								</BreadcrumbPage>
							) : (
								<BreadcrumbLink asChild>
									<Link href={crumb.href}>{crumb.label}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
