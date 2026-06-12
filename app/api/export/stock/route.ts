import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function escape(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\r\n");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") ?? undefined;

  const inventory = await prisma.inventory.findMany({
    where: {
      product:  { isActive: true },
      ...(locationId ? { locationId } : {}),
    },
    include: {
      product:  { include: { brand: true, category: true } },
      location: true,
    },
    orderBy: [
      { product: { brand: { name: "asc" } } },
      { product: { name: "asc" } },
    ],
  });

  const csv = toCsv(
    ["Product", "Brand", "Barcode", "SKU", "Category", "Location", "Qty on Hand", "Reorder Point", "Reorder Qty", "Min Qty"],
    inventory.map((i) => [
      i.product.name,
      i.product.brand?.name    ?? "",
      i.product.barcode        ?? "",
      i.product.sku            ?? "",
      i.product.category?.name ?? "",
      i.location.name,
      i.quantity,
      i.reorderPoint,
      i.reorderQty,
      i.minQuantity,
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stock-snapshot-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
