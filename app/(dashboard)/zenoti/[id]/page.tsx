import { FulfillmentView } from "@/components/zenoti/view/fulfillment-view";

export const metadata = { title: "Pack Order — Zenoti Fulfillment" };

export default async function ZenotiOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FulfillmentView orderId={id} />;
}
