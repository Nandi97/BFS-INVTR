import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface StockImportRow {
  identifier:   string;   // product name, barcode, or SKU
  location:     string;   // location name or code
  quantity:     number;
  reorderPoint?: number;
  reorderQty?:  number;
  minQuantity?: number;
}

async function resolveProduct(id: string) {
  return prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [
        { sku:     { equals: id.trim(), mode: "insensitive" } },
        { barcode: { equals: id.trim(), mode: "insensitive" } },
        { name:    { equals: id.trim(), mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
}

async function resolveLocation(id: string) {
  return prisma.location.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { equals: id.trim(), mode: "insensitive" } },
        { code: { equals: id.trim(), mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { rows }: { rows: StockImportRow[] } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows array required" }, { status: 400 });
  }

  let upserted = 0, skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.identifier || row.quantity == null || !row.location) {
      errors.push(`Row ${i + 1}: identifier, location, and quantity are required`);
      skipped++;
      continue;
    }

    const qty = Number(row.quantity);
    if (isNaN(qty) || qty < 0) {
      errors.push(`Row ${i + 1}: invalid quantity "${row.quantity}" — must be >= 0`);
      skipped++;
      continue;
    }

    try {
      const [product, location] = await Promise.all([
        resolveProduct(row.identifier),
        resolveLocation(row.location),
      ]);

      if (!product) {
        errors.push(`Row ${i + 1}: product not found "${row.identifier}"`);
        skipped++;
        continue;
      }
      if (!location) {
        errors.push(`Row ${i + 1}: location not found "${row.location}"`);
        skipped++;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const inv = await tx.inventory.upsert({
          where:  { productId_locationId: { productId: product.id, locationId: location.id } },
          update: {
            quantity:     qty,
            ...(row.reorderPoint != null ? { reorderPoint: Number(row.reorderPoint) } : {}),
            ...(row.reorderQty   != null ? { reorderQty:   Number(row.reorderQty)   } : {}),
            ...(row.minQuantity  != null ? { minQuantity:  Number(row.minQuantity)  } : {}),
          },
          create: {
            productId:    product.id,
            locationId:   location.id,
            quantity:     qty,
            reorderPoint: row.reorderPoint != null ? Number(row.reorderPoint) : 0,
            reorderQty:   row.reorderQty   != null ? Number(row.reorderQty)   : 0,
            minQuantity:  row.minQuantity  != null ? Number(row.minQuantity)  : 0,
          },
        });

        // Record as opening stock movement
        await tx.stockMovement.create({
          data: {
            productId:   product.id,
            locationId:  location.id,
            type:        "OPENING_STOCK",
            quantity:    qty,
            balanceAfter: qty,
            notes:       "Imported via bulk stock import",
          },
        });

        return inv;
      });

      upserted++;
    } catch (err: unknown) {
      errors.push(`Row ${i + 1} ("${row.identifier}"): ${err instanceof Error ? err.message : String(err)}`);
      skipped++;
    }
  }

  return NextResponse.json({ upserted, skipped, errors: errors.slice(0, 20), total: rows.length });
}
