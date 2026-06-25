import { ZenotiPageTabs } from '@/components/zenoti/dashboard/zenoti-page-tabs';

export const metadata = { title: 'Zenoti Fulfillment' };

export default function ZenotiPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Zenoti Fulfillment</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Pack and dispatch procurement orders raised by Beauty First
					Spa and Beauty Logix stores.
				</p>
			</div>
			<ZenotiPageTabs />
		</div>
	);
}
