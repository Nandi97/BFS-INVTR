-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PROFESSIONAL', 'RETAIL', 'BOTH');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'BOTH';
