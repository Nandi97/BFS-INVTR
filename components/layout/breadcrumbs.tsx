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
		<Breadcrumb>
			<BreadcrumbList>
				{crumbs.map((crumb, i) => (
					<Fragment key={crumb.href}>
						{i > 0 && <BreadcrumbSeparator />}
						<BreadcrumbItem>
							{crumb.isLast ? (
								<BreadcrumbPage>{crumb.label}</BreadcrumbPage>
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
