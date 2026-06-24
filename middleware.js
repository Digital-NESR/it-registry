import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

// Everything except the public auth endpoints, Next internals and static assets
// requires a session — either a Microsoft Entra SSO session (NextAuth) or the
// password fallback. Unauthenticated page loads redirect to /login; API calls 401.
export const config = {
  matcher: [
    "/((?!login|api/login|api/logout|api/auth|_next/static|_next/image|favicon.ico|icon.png|nesr-logo|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};

export async function middleware(req) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  // In production (https) NextAuth uses the __Secure- prefixed cookie; read the
  // same one here so the session is recognised behind a proxy/custom domain.
  const secureCookie = process.env.NODE_ENV === "production";
  let ssoToken = null;
  try {
    ssoToken = await getToken({ req, secret, secureCookie });
  } catch {
    ssoToken = null;
  }
  const passwordSession = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (ssoToken || passwordSession) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
