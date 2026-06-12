import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface SalesRow {
  identifier: string; // sku, barcode, or product name
  year:       number;
  month:      number;
  quantity:   number;
  revenue?:   number;
}

async function resolveProduct(identifier: string) {
  const id = identifier.trim();
  return prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [
        { sku:     { equals: id, mode: "insensitive" } },
        { barcode: { equals: id, mode: "insensitive" } },
        { name:    { equals: id, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { rows, source = "MANUAL_IMPORT" }: { rows: SalesRow[]; source?: string } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows array is required" }, { status: 400 });
  }

  let imported = 0;
  let skipped  = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.identifier || !row.year || !row.month || row.quantity === undefined) {
      errors.push(`Invalid row: ${JSON.stringify(row)}`);
      skipped++;
      continue;
    }

    const year  = Number(row.year);
    const month = Number(row.month);
    const qty   = Number(row.quantity);

    if (month < 1 || month > 12 || year < 2000 || year > 2100 || isNaN(qty)) {
      errors.push(`Bad values for "${row.identifier}" (${year}-${month})`);
      skipped++;
      continue;
    }

    const product = await resolveProduct(row.identifier);
    if (!product) {
      errors.push(`Product not found: "${row.identifier}"`);
      skipped++;
      continue;
    }

    await prisma.salesRecord.upsert({
      where: { productId_year_month: { productId: product.id, year, month } },
      update: {
        quantity: qty,
        revenue:  row.revenue != null ? Number(row.revenue) : undefined,
        source,
      },
      create: {
        productId: product.id,
        year,
        month,
        quantity: qty,
        revenue:  row.revenue != null ? Number(row.revenue) : 0,
        source,
      },
    });
    imported++;
  }

  return NextResponse.json({
    imported,
    skipped,
    errors: errors.slice(0, 20),
    total: rows.length,
  });
}
