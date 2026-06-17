import { betterFetch } from "@better-fetch/fetch";
import { NextRequest, NextResponse } from "next/server";
import type { Session } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/uploadthing", "/legal"];

// Allowlist: specific emails OR whole domains (e.g. "@beautylogix.ca")
const ALLOWED_EMAILS = [
  "cartezalvin@gmail.com",
  "order@beautylogix.ca",
  "alvinkigen+github@outlook.com",
];
const ALLOWED_DOMAINS = ["beautylogix.ca", "beautyfirstspa.com"];

function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  if (ALLOWED_EMAILS.includes(email.toLowerCase())) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow server-to-server calls (cron → internal API routes) authenticated by CRON_SECRET
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.next();
  }

  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") ?? "" },
    },
  );

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isAllowed(session.user.email)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
