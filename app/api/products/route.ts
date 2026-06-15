import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "../../../generated/prisma/client";
import { requireRole } from "@/lib/require-role";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search     = searchParams.get("search") ?? "";
    const brandId    = searchParams.get("brandId");
    const categoryId = searchParams.get("categoryId");
    const isActive   = searchParams.get("isActive");
    const productType = searchParams.get("productType");
    const page       = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit      = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const skip       = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(search && {
        OR: [
          { name:    { contains: search, mode: "insensitive" } },
          { sku:     { contains: search, mode: "insensitive" } },
          { barcode: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(brandId    && { brandId }),
      ...(categoryId && { categoryId }),
      ...(isActive !== null && isActive !== undefined && { isActive: isActive === "true" }),
      ...(productType && { productType: productType as Prisma.EnumProductTypeFilter["equals"] }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          brand:    { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          inventory: { select: { quantity: true } },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const productsWithStock = products.map((p) => ({
      ...p,
      totalStock: p.inventory.reduce((sum, i) => sum + i.quantity, 0),
    }));

    return NextResponse.json({ products: productsWithStock, total, page, limit });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  try {
    const body = await req.json();
    const { name, sku, barcode, brandId, categoryId, productType, unit, description, imageUrl } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        sku:  sku?.trim()  || null,
        barcode: barcode?.trim() || null,
        brandId:    brandId    || null,
        categoryId: categoryId || null,
        productType: productType ?? "BOTH",
        unit: unit?.trim() || "each",
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
      },
      include: {
        brand:    { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      const field = err.meta?.target?.[0] ?? "field";
      return NextResponse.json({ error: `${field} already exists` }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
