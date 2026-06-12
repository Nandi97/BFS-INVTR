import { NextResponse } from "next/server";
import { getQboTokens, revokeTokens, clearQboTokens } from "@/lib/qbo";

export async function POST() {
  const tokens = await getQboTokens();

  if (tokens) {
    try {
      await revokeTokens(tokens);
    } catch {
      // Revocation failure shouldn't block disconnecting locally
    }
    await clearQboTokens();
  }

  return NextResponse.json({ disconnected: true });
}
