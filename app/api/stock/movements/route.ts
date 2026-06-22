import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// RECONCILIATION excluded — it is a balance snapshot (balance × n syncs inflates totalIn)
const IN_TYPES  = ["PURCHASE_RECEIPT", "ADJUSTMENT_IN", "OPENING_STOCK", "TRANSFER_IN"] as const;
const OUT_TYPES = ["SALE", "ADJUSTMENT_OUT", "TRANSFER_OUT"] as const;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const productId  = searchParams.get("productId");
  const brandId    = searchParams.get("brandId");
  const type       = searchParams.get("type");
  const dateFrom   = searchParams.get("dateFrom");
  const dateTo     = searchParams.get("dateTo");
  const page       = parseInt(searchParams.get("page")  ?? "1",  10);
  const limit      = parseInt(searchParams.get("limit") ?? "50", 10);
  const skip       = (page - 1) * limit;

  const where = {
    ...(locationId ? { locationId } : {}),
    ...(productId  ? { productId }  : {}),
    ...(brandId    ? { product: { brandId } } : {}),
    ...(type       ? { type: type as never }  : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) }               : {}),
            ...(dateTo   ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
          },
        }
      : {}),
  };

  const [movements, total, inAgg, outAgg] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { include: { brand: true } },
        location: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.aggregate({
      where: { ...where, type: { in: IN_TYPES as never } },
      _sum: { quantity: true },
    }),
    prisma.stockMovement.aggregate({
      where: { ...where, type: { in: OUT_TYPES as never } },
      _sum: { quantity: true },
    }),
  ]);

  const summary = {
    totalIn:  inAgg._sum.quantity  ?? 0,
    totalOut: outAgg._sum.quantity ?? 0,
  };

  return NextResponse.json({ data: movements, total, page, limit, summary });
}
