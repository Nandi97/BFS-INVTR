import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page  = parseInt(searchParams.get("page")  ?? "1",  10);
  const limit = parseInt(searchParams.get("limit") ?? "30", 10);
  const skip  = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.emailLog.count(),
  ]);

  return NextResponse.json({ data: logs, total, page, limit });
}
