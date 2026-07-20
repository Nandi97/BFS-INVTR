-- AlterTable
ALTER TABLE "ShopifyOrder" ADD COLUMN     "discountCodes" TEXT,
ADD COLUMN     "totalDiscounts" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ShopifyOrderItem" ADD COLUMN     "totalDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ShopifyFulfillment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyFulfillmentItem" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "shopifyLineItemId" TEXT,
    "productId" TEXT,
    "sku" TEXT,
    "title" TEXT NOT NULL,
    "variantTitle" TEXT,
    "requestedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fulfilledQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION,
    "totalDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPacked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopifyFulfillmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyFulfillment_orderId_key" ON "ShopifyFulfillment"("orderId");

-- AddForeignKey
ALTER TABLE "ShopifyFulfillment" ADD CONSTRAINT "ShopifyFulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopifyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyFulfillmentItem" ADD CONSTRAINT "ShopifyFulfillmentItem_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "ShopifyFulfillment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyFulfillmentItem" ADD CONSTRAINT "ShopifyFulfillmentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
