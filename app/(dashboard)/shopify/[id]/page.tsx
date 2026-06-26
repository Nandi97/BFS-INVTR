import { ShopifyOrderView } from '@/components/shopify/view/shopify-order-view';

export const metadata = { title: 'Shopify Order — BFS Inventory' };

export default async function ShopifyOrderPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <ShopifyOrderView id={id} />;
}
