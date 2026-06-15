import { NextRequest, NextResponse } from "next/server";

/** Monthly cron: runs on the 1st of each month at 07:00 UTC.
 *  Triggers the QB name sync — overwrites product names from QB Items (SKU-matched only).
 *  Protected by the same CRON_SECRET as the nightly sync.
 */
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

  try {
    const res    = await fetch(`${base}/api/integrations/quickbooks/items/sync-names`, { method: "POST", headers });
    const result = await res.json();
    return NextResponse.json({ ok: true, ran: new Date().toISOString(), result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
