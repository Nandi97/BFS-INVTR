import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "all"; // all | low | out
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const skip = (page - 1) * limit;

  const baseWhere = {
    ...(locationId ? { locationId } : {}),
    product: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
              { barcode: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
  };

  if (status === "low") {
    // Field-to-field comparison not supported in Prisma ORM
    // Fetch all matching and filter in memory (inventory is small)
    const all = await prisma.inventory.findMany({
      where: baseWhere,
      include: { product: { include: { brand: true } }, location: true },
      orderBy: { product: { name: "asc" } },
    });
    const filtered = all.filter(
      (r) => r.quantity > 0 && r.reorderPoint > 0 && r.quantity <= r.reorderPoint
    );
    const total = filtered.length;
    const data = filtered.slice(skip, skip + limit);
    return NextResponse.json({ data, total, page, limit });
  }

  const inventoryWhere = {
    ...baseWhere,
    ...(status === "out" ? { quantity: { lte: 0 } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.inventory.findMany({
      where: inventoryWhere,
      include: { product: { include: { brand: true } }, location: true },
      orderBy: { product: { name: "asc" } },
      skip,
      take: limit,
    }),
    prisma.inventory.count({ where: inventoryWhere }),
  ]);

  return NextResponse.json({ data: items, total, page, limit });
}
