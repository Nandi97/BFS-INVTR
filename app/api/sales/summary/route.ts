import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year    = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const brandId = searchParams.get("brandId") ?? undefined;

  // Monthly totals for selected year
  const monthlyRaw = await prisma.salesRecord.groupBy({
    by: ["month"],
    where: {
      year,
      product: { isActive: true, ...(brandId ? { brandId } : {}) },
    },
    _sum: { quantity: true, revenue: true },
    orderBy: { month: "asc" },
  });

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const found = monthlyRaw.find((r) => r.month === i + 1);
    return {
      month:    MONTH_NAMES[i],
      monthNum: i + 1,
      quantity: found?._sum.quantity ?? 0,
      revenue:  found?._sum.revenue  ?? 0,
    };
  });

  // Top products for selected year
  const topRaw = await prisma.salesRecord.groupBy({
    by: ["productId"],
    where: {
      year,
      product: { isActive: true, ...(brandId ? { brandId } : {}) },
    },
    _sum: { quantity: true, revenue: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 15,
  });

  const productIds = topRaw.map((r) => r.productId);
  const products   = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { brand: true },
  });

  const topProducts = topRaw.map((r) => {
    const p = products.find((p) => p.id === r.productId);
    return {
      productId:    r.productId,
      name:         p?.name ?? "Unknown",
      brand:        p?.brand?.name ?? null,
      sku:          p?.sku ?? p?.barcode ?? null,
      totalQty:     r._sum.quantity ?? 0,
      totalRevenue: r._sum.revenue  ?? 0,
      avgMonthly:   Math.round(((r._sum.quantity ?? 0) / 12) * 10) / 10,
    };
  });

  // Year-over-year comparison (this year vs last year)
  const lastYear = year - 1;
  const [thisYearTotals, lastYearTotals] = await Promise.all([
    prisma.salesRecord.aggregate({
      where: { year,     product: { isActive: true, ...(brandId ? { brandId } : {}) } },
      _sum: { quantity: true, revenue: true },
    }),
    prisma.salesRecord.aggregate({
      where: { year: lastYear, product: { isActive: true, ...(brandId ? { brandId } : {}) } },
      _sum: { quantity: true, revenue: true },
    }),
  ]);

  // Available years
  const yearsRaw = await prisma.salesRecord.findMany({
    select:   { year: true },
    distinct: ["year"],
    orderBy:  { year: "desc" },
  });
  const availableYears = yearsRaw.map((r) => r.year);

  // Total active products with any sales this year
  const productsWithSales = await prisma.salesRecord.findMany({
    where:    { year, product: { isActive: true } },
    select:   { productId: true },
    distinct: ["productId"],
  });

  return NextResponse.json({
    year,
    monthly,
    topProducts,
    yoy: {
      thisYear: { qty: thisYearTotals._sum.quantity ?? 0, revenue: thisYearTotals._sum.revenue ?? 0 },
      lastYear: { qty: lastYearTotals._sum.quantity ?? 0, revenue: lastYearTotals._sum.revenue ?? 0 },
    },
    availableYears: availableYears.length > 0 ? availableYears : [year],
    productsTracked: productsWithSales.length,
  });
}
