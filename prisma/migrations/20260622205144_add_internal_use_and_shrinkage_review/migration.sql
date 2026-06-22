-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'INTERNAL_USE';

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "isReviewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3);
