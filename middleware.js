import { NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

// Everything except the public auth endpoints, Next internals and static assets
// requires a valid session. Unauthenticated page loads redirect to /login;
// unauthenticated API calls get a 401.
export const config = {
  matcher: [
    "/((?!login|api/login|api/logout|_next/static|_next/image|favicon.ico|icon.png|nesr-logo|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};

export async function middleware(req) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (session) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
