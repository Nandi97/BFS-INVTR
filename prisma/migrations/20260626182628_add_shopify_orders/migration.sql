-- CreateTable
CREATE TABLE "ShopifyOrder" (
    "id" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "storeDomain" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "shippingName" TEXT,
    "shippingAddress1" TEXT,
    "shippingCity" TEXT,
    "shippingProvince" TEXT,
    "shippingZip" TEXT,
    "shippingCountry" TEXT,
    "totalPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "financialStatus" TEXT,
    "fulfillmentStatus" TEXT,
    "shopifyStatus" TEXT NOT NULL DEFAULT 'open',
    "note" TEXT,
    "tags" TEXT,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAtShopify" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shopifyLineItemId" TEXT NOT NULL,
    "shopifyVariantId" TEXT,
    "sku" TEXT,
    "title" TEXT NOT NULL,
    "variantTitle" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ShopifyOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyOrder_shopifyOrderId_key" ON "ShopifyOrder"("shopifyOrderId");

-- AddForeignKey
ALTER TABLE "ShopifyOrderItem" ADD CONSTRAINT "ShopifyOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopifyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
