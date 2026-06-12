import { NextResponse } from "next/server";
import { runAlertRules } from "@/lib/notification-engine";

export async function POST() {
  try {
    const result = await runAlertRules();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
