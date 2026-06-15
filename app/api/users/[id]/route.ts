import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const _auth = await requireRole("ADMIN");
  if (_auth instanceof NextResponse) return _auth;

  const { id } = await params;
  const body   = await req.json();
  const { role } = body;

  if (!["ADMIN", "MANAGER", "VIEWER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Prevent self-demotion
  if (id === _auth.user.id && role !== "ADMIN") {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data:  { role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(updated);
}
