-- CreateTable
CREATE TABLE "PendingProduct" (
    "id" TEXT NOT NULL,
    "qboItemId" TEXT NOT NULL,
    "qboName" TEXT NOT NULL,
    "qboSku" TEXT,
    "qtyOnHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchaseCost" DOUBLE PRECISION,
    "suggestedBrandId" TEXT,
    "suggestedBrandName" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "seenCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PendingProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingProduct_qboItemId_key" ON "PendingProduct"("qboItemId");
