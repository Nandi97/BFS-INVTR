import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      inventory: {
        include: { product: { include: { brand: true } } },
        orderBy: { product: { name: "asc" } },
      },
      _count: { select: { inventory: true, stockMovements: true } },
    },
  });

  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(location);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _auth = await requireRole("ADMIN");
  if (_auth instanceof NextResponse) return _auth;

  const { id } = await params;
  const body = await req.json();
  const { name, code, type, address, isActive } = body;

  const location = await prisma.location.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(code !== undefined ? { code: code.trim().toUpperCase() } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(address !== undefined ? { address: address?.trim() ?? null } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json(location);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _auth = await requireRole("ADMIN");
  if (_auth instanceof NextResponse) return _auth;

  const { id } = await params;

  const invCount = await prisma.inventory.count({ where: { locationId: id } });
  if (invCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a location that has inventory records. Deactivate it instead." },
      { status: 409 }
    );
  }

  await prisma.location.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
