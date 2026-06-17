import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { computeAvgMonthly, SAFETY_DAYS } from "@/lib/sales-calc";

export interface PolicyProduct {
  id:                string;
  name:              string;
  sku:               string | null;
  brandId:           string | null;
  brandName:         string;
  leadTimeDays:      number;
  targetStockMonths: number;
  avgMonthly:        number;
  reorderPoint:      number;
  reorderQty:        number;
  hasSalesData:      boolean;
  confident:         boolean;
}

export interface PolicyBrand {
  brandId:      string | null;
  brandName:    string;
  leadTimeDays: number;
  products:     PolicyProduct[];
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id:                true,
        name:              true,
        sku:               true,
        targetStockMonths: true,
        brand:             { select: { id: true, name: true, leadTimeDays: true } },
        salesRecords: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take:    12,
          select:  { quantity: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const grouped = new Map<string, PolicyBrand>();

    for (const p of products) {
      const brandName    = p.brand?.name ?? "No Brand";
      const leadTimeDays = p.brand?.leadTimeDays ?? 30;

      const { avgMonthly, confident } = computeAvgMonthly(p.salesRecords);

      const reorderPoint = avgMonthly > 0
        ? Math.ceil(avgMonthly * (leadTimeDays + SAFETY_DAYS) / 30)
        : 0;
      const reorderQty = avgMonthly > 0
        ? Math.ceil(avgMonthly * p.targetStockMonths)
        : 0;

      const row: PolicyProduct = {
        id:                p.id,
        name:              p.name,
        sku:               p.sku,
        brandId:           p.brand?.id ?? null,
        brandName,
        leadTimeDays,
        targetStockMonths: p.targetStockMonths,
        avgMonthly:        Math.round(avgMonthly * 10) / 10,
        reorderPoint,
        reorderQty,
        hasSalesData:      p.salesRecords.length > 0,
        confident,
      };

      if (!grouped.has(brandName)) {
        grouped.set(brandName, { brandId: p.brand?.id ?? null, brandName, leadTimeDays, products: [] });
      }
      grouped.get(brandName)!.products.push(row);
    }

    const brands = Array.from(grouped.values()).sort((a, b) =>
      a.brandName.localeCompare(b.brandName)
    );

    return NextResponse.json({ brands, total: products.length });
  } catch (err) {
    console.error("[settings/stock-policy GET]", err);
    return NextResponse.json({ error: "Failed to load stock policy" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { updates }: { updates: { id: string; targetStockMonths: number }[] } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "updates array required" }, { status: 400 });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const u of updates) {
      const months = Math.round(Number(u.targetStockMonths));
      if (!u.id || isNaN(months) || months < 1 || months > 36) {
        errors.push(`Invalid: id=${u.id} targetStockMonths=${u.targetStockMonths}`);
        continue;
      }
      try {
        await prisma.product.update({ where: { id: u.id }, data: { targetStockMonths: months } });
        updated++;
      } catch {
        errors.push(`Failed to update ${u.id}`);
      }
    }

    return NextResponse.json({ updated, errors, total: updates.length });
  } catch (err) {
    console.error("[settings/stock-policy PATCH]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
