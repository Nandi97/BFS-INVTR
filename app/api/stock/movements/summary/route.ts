import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export interface ProductMovementSummary {
  productId:     string;
  productName:   string;
  brandName:     string | null;
  totalIn:       number;
  totalOut:      number;
  netChange:     number;
  movementCount: number;
  lastMovement:  string;
  currentStock:  number;
}

const IN_TYPES  = ["PURCHASE_RECEIPT", "ADJUSTMENT_IN", "TRANSFER_IN"] as const;
const OUT_TYPES = ["ADJUSTMENT_OUT", "SALE", "TRANSFER_OUT"] as const;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const brandId    = searchParams.get("brandId");
  const dateFrom   = searchParams.get("dateFrom");
  const dateTo     = searchParams.get("dateTo");
  // "in" = restocks only, "out" = dispatches only, default = all
  const typeGroup  = searchParams.get("typeGroup") as "in" | "out" | null;

  const conditions: Prisma.Sql[] = [];
  if (locationId) conditions.push(Prisma.sql`sm."locationId" = ${locationId}`);
  if (brandId)    conditions.push(Prisma.sql`p."brandId" = ${brandId}`);
  if (dateFrom)   conditions.push(Prisma.sql`sm."createdAt" >= ${new Date(dateFrom)}`);
  if (dateTo)     conditions.push(Prisma.sql`sm."createdAt" <= ${new Date(dateTo + "T23:59:59Z")}`);

  if (typeGroup === "in") {
    conditions.push(Prisma.sql`sm.type IN ('PURCHASE_RECEIPT','ADJUSTMENT_IN','TRANSFER_IN')`);
  } else if (typeGroup === "out") {
    conditions.push(Prisma.sql`sm.type IN ('ADJUSTMENT_OUT','SALE','TRANSFER_OUT')`);
  } else {
    // Exclude snapshots from unfiltered view
    conditions.push(Prisma.sql`sm.type NOT IN ('RECONCILIATION','OPENING_STOCK')`);
  }

  const where = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  const orderBy = typeGroup === "in"
    ? Prisma.sql`ORDER BY "totalIn"  DESC`
    : typeGroup === "out"
    ? Prisma.sql`ORDER BY "totalOut" DESC`
    : Prisma.sql`ORDER BY "totalOut" DESC`;

  const rows = await prisma.$queryRaw<Array<{
    productId:     string;
    productName:   string;
    brandName:     string | null;
    totalOut:      number;
    totalIn:       number;
    movementCount: bigint;
    lastMovement:  Date;
  }>>`
    SELECT
      sm."productId",
      p.name                                                          AS "productName",
      b.name                                                          AS "brandName",
      COALESCE(SUM(CASE WHEN sm.type IN (
        'ADJUSTMENT_OUT','SALE','TRANSFER_OUT'
      ) THEN sm.quantity ELSE 0 END), 0)::float                      AS "totalOut",
      COALESCE(SUM(CASE WHEN sm.type IN (
        'PURCHASE_RECEIPT','ADJUSTMENT_IN','TRANSFER_IN'
      ) THEN sm.quantity ELSE 0 END), 0)::float                      AS "totalIn",
      COUNT(*)                                                        AS "movementCount",
      MAX(sm."createdAt")                                             AS "lastMovement"
    FROM "StockMovement" sm
    JOIN "Product"  p ON p.id  = sm."productId"
    LEFT JOIN "Brand" b ON b.id = p."brandId"
    ${where}
    GROUP BY sm."productId", p.name, b.name
    ${orderBy}
  `;

  // Fetch current stock from Inventory (same source as Products page)
  const productIds = rows.map((r) => r.productId);
  const stockRows = productIds.length > 0
    ? await prisma.inventory.groupBy({
        by: ["productId"],
        where: {
          productId: { in: productIds },
          ...(locationId ? { locationId } : {}),
          location: { isActive: true },
        },
        _sum: { quantity: true },
      })
    : [];

  const stockByProduct = new Map(
    stockRows.map((s) => [s.productId, s._sum.quantity ?? 0])
  );

  const data: ProductMovementSummary[] = rows.map((r) => ({
    productId:     r.productId,
    productName:   r.productName,
    brandName:     r.brandName,
    totalIn:       r.totalIn,
    totalOut:      r.totalOut,
    netChange:     r.totalIn - r.totalOut,
    movementCount: Number(r.movementCount),
    lastMovement:  r.lastMovement.toISOString(),
    currentStock:  stockByProduct.get(r.productId) ?? 0,
  }));

  return NextResponse.json({ data, total: data.length });
}

export { IN_TYPES, OUT_TYPES };
