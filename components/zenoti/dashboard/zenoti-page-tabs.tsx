'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZenotiOrdersTable } from './zenoti-orders-table';
import { ZenotiImportPanel } from '../import/zenoti-import-panel';

export function ZenotiPageTabs() {
	return (
		<Tabs defaultValue="orders">
			<TabsList>
				<TabsTrigger value="orders">Procurement Orders</TabsTrigger>
				<TabsTrigger value="import">Import from Excel</TabsTrigger>
			</TabsList>
			<TabsContent value="orders" className="mt-4">
				<ZenotiOrdersTable />
			</TabsContent>
			<TabsContent value="import" className="mt-4">
				<ZenotiImportPanel />
			</TabsContent>
		</Tabs>
	);
}
