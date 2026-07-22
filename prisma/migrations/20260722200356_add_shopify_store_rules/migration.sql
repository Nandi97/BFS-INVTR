-- CreateEnum
CREATE TYPE "ShopifyCatalogMode" AS ENUM ('ALL', 'BRAND_FILTERED');

-- CreateTable
CREATE TABLE "ShopifyStoreSettings" (
    "storeDomain" TEXT NOT NULL,
    "label" TEXT,
    "catalogMode" "ShopifyCatalogMode" NOT NULL DEFAULT 'ALL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyStoreSettings_pkey" PRIMARY KEY ("storeDomain")
);

-- CreateTable
CREATE TABLE "ShopifyStoreBrandRule" (
    "id" TEXT NOT NULL,
    "storeDomain" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifyStoreBrandRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyProductMapping" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeDomain" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyStoreBrandRule_storeDomain_brandId_key" ON "ShopifyStoreBrandRule"("storeDomain", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyProductMapping_productId_storeDomain_key" ON "ShopifyProductMapping"("productId", "storeDomain");

-- AddForeignKey
ALTER TABLE "ShopifyStoreBrandRule" ADD CONSTRAINT "ShopifyStoreBrandRule_storeDomain_fkey" FOREIGN KEY ("storeDomain") REFERENCES "ShopifyStoreSettings"("storeDomain") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyStoreBrandRule" ADD CONSTRAINT "ShopifyStoreBrandRule_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyProductMapping" ADD CONSTRAINT "ShopifyProductMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
