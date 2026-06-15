import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  try {
    const { id } = await params;
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const category = await prisma.category.update({ where: { id }, data: { name: name.trim() } });
    return NextResponse.json(category);
  } catch (err: any) {
    if (err?.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (err?.code === "P2002") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  try {
    const { id } = await params;
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${count} product(s) use this category` },
        { status: 409 }
      );
    }
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
