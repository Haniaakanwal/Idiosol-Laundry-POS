import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session";

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/admin-reset",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  const session = await verifySession(token);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Pass the verified identity to route handlers via headers so routes can
  // enforce tenant scoping / role checks against a value the client can't
  // tamper with (query params and body fields are client-controlled).
  const headers = new Headers(req.headers);
  headers.set("x-session-id", session.id);
  headers.set("x-session-role", session.role);
  if (session.tenantId) headers.set("x-session-tenant-id", session.tenantId);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
};