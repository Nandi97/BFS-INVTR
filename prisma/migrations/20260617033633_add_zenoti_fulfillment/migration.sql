-- CreateEnum
CREATE TYPE "ZenotiOrderStatus" AS ENUM ('RAISED', 'UPDATED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'INVOICED');

-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'ZENOTI';

-- CreateTable
CREATE TABLE "ZenotiOrder" (
    "id" TEXT NOT NULL,
    "zenotiOrderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "centerName" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "zenotiStatus" "ZenotiOrderStatus" NOT NULL,
    "raisedAt" TIMESTAMP(3),
    "deliverBy" TIMESTAMP(3),
    "notes" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZenotiOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZenotiOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "zenotiItemId" TEXT,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "retailRaised" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "consumableRaised" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION,

    CONSTRAINT "ZenotiOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BfsFulfillment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "qbInvoiceId" TEXT,
    "qbInvoiceNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BfsFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BfsFulfillmentItem" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "zenotiItemId" TEXT,
    "productId" TEXT,
    "productCode" TEXT,
    "productName" TEXT NOT NULL,
    "requestedRetailQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestedConsumableQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fulfilledRetailQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fulfilledConsumableQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPacked" BOOLEAN NOT NULL DEFAULT false,
    "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "unitPrice" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BfsFulfillmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZenotiOrder_zenotiOrderId_key" ON "ZenotiOrder"("zenotiOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "BfsFulfillment_orderId_key" ON "BfsFulfillment"("orderId");

-- AddForeignKey
ALTER TABLE "ZenotiOrderItem" ADD CONSTRAINT "ZenotiOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ZenotiOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BfsFulfillment" ADD CONSTRAINT "BfsFulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ZenotiOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BfsFulfillmentItem" ADD CONSTRAINT "BfsFulfillmentItem_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "BfsFulfillment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BfsFulfillmentItem" ADD CONSTRAINT "BfsFulfillmentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
