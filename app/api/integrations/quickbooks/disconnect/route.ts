import { NextResponse } from "next/server";
import { getQboTokens, revokeTokens, clearQboTokens } from "@/lib/qbo";
import { requireRole } from "@/lib/require-role";

export async function POST() {
  const _auth = await requireRole("ADMIN");
  if (_auth instanceof NextResponse) return _auth;

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
