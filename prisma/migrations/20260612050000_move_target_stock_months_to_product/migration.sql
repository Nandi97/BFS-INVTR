-- Remove targetStockMonths from Brand (added in previous migration)
ALTER TABLE "Brand" DROP COLUMN IF EXISTS "targetStockMonths";

-- Add targetStockMonths to Product with default 6
ALTER TABLE "Product" ADD COLUMN "targetStockMonths" INTEGER NOT NULL DEFAULT 6;
