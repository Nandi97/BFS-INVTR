import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("MANAGER");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();

  const updated = await prisma.bfsFulfillment.update({
    where: { id },
    data: {
      status:      body.status      ?? undefined,
      qbInvoiceId: body.qbInvoiceId ?? undefined,
      qbInvoiceNo: body.qbInvoiceNo ?? undefined,
    },
  });

  return NextResponse.json(updated);
}
