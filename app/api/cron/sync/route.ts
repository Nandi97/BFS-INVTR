import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called nightly by Vercel cron (or any external cron service).
// Vercel sends: Authorization: Bearer <CRON_SECRET>
// External services must send the same header.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const base    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const headers = {
    "Content-Type":  "application/json",
    "authorization": `Bearer ${process.env.CRON_SECRET}`,
  };

  const results: Record<string, unknown> = {};

  // 1 — Stock sync via QB Items API
  try {
    const res  = await fetch(`${base}/api/integrations/quickbooks/items`, { method: "POST", headers, body: JSON.stringify({ location: "BF Warehouse" }) });
    results.stock = await res.json();
  } catch (err) {
    results.stock = { error: err instanceof Error ? err.message : String(err) };
  }

  // 2 — Sales sync via QB Reports API
  try {
    const res  = await fetch(`${base}/api/integrations/quickbooks/sync-sales-api`, { method: "POST", headers });
    results.sales = await res.json();
  } catch (err) {
    results.sales = { error: err instanceof Error ? err.message : String(err) };
  }

  await prisma.integrationConfig.update({
    where: { provider: "QUICKBOOKS" },
    data:  { lastSyncAt: new Date() },
  }).catch(() => null);

  return NextResponse.json({ ok: true, ran: new Date().toISOString(), results });
}
