import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier:  true,
      location:  true,
      createdBy: { select: { id: true, name: true } },
      items: {
        include: { product: { include: { brand: true } } },
        orderBy: { product: { name: "asc" } },
      },
    },
  });

  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(po);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  const { id } = await params;
  const body = await req.json();
  const { status, notes, sentAt } = body;

  const existing = await prisma.purchaseOrder.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status }                             : {}),
      ...(notes  !== undefined ? { notes: notes?.trim() || null }      : {}),
      ...(sentAt !== undefined ? { sentAt: sentAt ? new Date(sentAt) : null } : {}),
      ...(status === "SENT" && !existing.status.includes("SENT") ? { sentAt: new Date() } : {}),
    },
    include: {
      supplier: true,
      location: true,
      items: { include: { product: { include: { brand: true } } } },
    },
  });

  return NextResponse.json(po);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  const { id } = await params;

  const po = await prisma.purchaseOrder.findUnique({ where: { id }, select: { status: true } });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (po.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT purchase orders can be deleted." }, { status: 409 });
  }

  await prisma.purchaseOrder.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
