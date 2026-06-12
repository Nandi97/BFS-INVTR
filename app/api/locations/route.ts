import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as string | null;
  const active = searchParams.get("active");

  const locations = await prisma.location.findMany({
    where: {
      ...(type ? { type: type as never } : {}),
      ...(active !== null ? { isActive: active === "true" } : {}),
    },
    include: {
      _count: { select: { inventory: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, code, type, address } = body;

  if (!name?.trim() || !code?.trim()) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
  }

  const location = await prisma.location.create({
    data: {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type: type ?? "WAREHOUSE",
      address: address?.trim() ?? null,
    },
  });

  return NextResponse.json(location, { status: 201 });
}
