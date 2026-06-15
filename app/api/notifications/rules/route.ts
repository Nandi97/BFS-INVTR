import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function GET() {
  const rules = await prisma.alertRule.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  const body = await req.json();
  const { name, type, recipients, thresholdMonths, isActive } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!type)         return NextResponse.json({ error: "Type is required" }, { status: 400 });

  const recipientList: string[] = Array.isArray(recipients)
    ? recipients.filter((r: string) => r?.trim())
    : typeof recipients === "string"
    ? recipients.split(",").map((r: string) => r.trim()).filter(Boolean)
    : [];

  if (recipientList.length === 0) {
    return NextResponse.json({ error: "At least one recipient email is required" }, { status: 400 });
  }

  const rule = await prisma.alertRule.create({
    data: {
      name:           name.trim(),
      type:           type as never,
      recipients:     recipientList,
      thresholdMonths: thresholdMonths ? Number(thresholdMonths) : null,
      isActive:       isActive ?? true,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
