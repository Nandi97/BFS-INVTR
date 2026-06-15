import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

async function generatePoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last = await prisma.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: "desc" },
    select: { poNumber: true },
  });
  const seq = last ? parseInt(last.poNumber.split("-")[2] ?? "0", 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status     = searchParams.get("status");
  const supplierId = searchParams.get("supplierId");
  const locationId = searchParams.get("locationId");
  const page       = parseInt(searchParams.get("page")  ?? "1",  10);
  const limit      = parseInt(searchParams.get("limit") ?? "30", 10);
  const skip       = (page - 1) * limit;

  const where = {
    ...(status     ? { status: status as never }         : {}),
    ...(supplierId ? { supplierId }                      : {}),
    ...(locationId ? { locationId }                      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, code: true } },
        _count:   { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return NextResponse.json({ data: orders, total, page, limit });
}

export async function POST(req: NextRequest) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  const body = await req.json();
  const { supplierId, locationId, notes, items } = body;

  if (!supplierId || !locationId) {
    return NextResponse.json({ error: "supplierId and locationId are required" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
  }

  const poNumber = await generatePoNumber();

  let po;
  try {
    po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId,
      locationId,
      notes: notes?.trim() || null,
      items: {
        create: items.map((item: { productId: string; quantity: number; unitCost?: number; notes?: string }) => ({
          productId: item.productId,
          quantity:  Number(item.quantity),
          unitCost:  item.unitCost  ? Number(item.unitCost) : null,
          notes:     item.notes?.trim() || null,
        })),
      },
    },
      include: {
        supplier: true,
        location: true,
        items: { include: { product: { include: { brand: true } } } },
      },
    });
  } catch (err: unknown) {
    const isPrismaFk =
      err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2003";
    if (isPrismaFk) {
      return NextResponse.json({ error: "One or more products or the supplier/location were not found." }, { status: 422 });
    }
    throw err;
  }

  return NextResponse.json(po, { status: 201 });
}
