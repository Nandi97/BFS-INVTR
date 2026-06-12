import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface QbConfig {
  companyName:     string;
  defaultLocation: string;
  notes:           string;
}

const DEFAULT: QbConfig = { companyName: "", defaultLocation: "BF Warehouse", notes: "" };

export async function GET() {
  const row = await prisma.integrationConfig.findUnique({
    where: { provider: "QUICKBOOKS" },
  });
  const config: QbConfig = row ? (row.config as unknown as QbConfig) : DEFAULT;
  return NextResponse.json({ config, isActive: row?.isActive ?? false, lastSyncAt: row?.lastSyncAt ?? null });
}

export async function PUT(req: NextRequest) {
  const body: Partial<QbConfig> = await req.json();
  const merged = { ...DEFAULT, ...body };

  const row = await prisma.integrationConfig.upsert({
    where:  { provider: "QUICKBOOKS" },
    update: { config: merged, isActive: true, updatedAt: new Date() },
    create: { provider: "QUICKBOOKS", config: merged, isActive: true },
  });

  return NextResponse.json({ config: row.config, isActive: row.isActive });
}
