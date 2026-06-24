import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Everything except the public auth endpoints, Next internals and static assets
// requires a Microsoft Entra (SSO) session. Unauthenticated page loads redirect
// to /login; API calls get a 401.
export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|icon.png|nesr-logo|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};

export async function middleware(req) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  const secureCookie = process.env.NODE_ENV === "production";
  let token = null;
  try {
    token = await getToken({ req, secret, secureCookie });
  } catch {
    token = null;
  }
  if (token) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
