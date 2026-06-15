import { NextResponse } from "next/server";
import { QBO_AUTH_URL, QBO_SCOPE } from "@/lib/qbo";
import { cookies } from "next/headers";
import { requireRole } from "@/lib/require-role";

export async function GET() {
  const _auth = await requireRole("ADMIN");
  if (_auth instanceof NextResponse) return _auth;

  const state = crypto.randomUUID();

  // Store state in a short-lived cookie for CSRF verification in the callback
  const jar = await cookies();
  jar.set("qbo_oauth_state", state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   600, // 10 minutes
    path:     "/",
  });

  const params = new URLSearchParams({
    client_id:     process.env.QBO_CLIENT_ID!,
    response_type: "code",
    scope:         QBO_SCOPE,
    redirect_uri:  process.env.QBO_REDIRECT_URI!,
    state,
  });

  return NextResponse.redirect(`${QBO_AUTH_URL}?${params}`);
}
