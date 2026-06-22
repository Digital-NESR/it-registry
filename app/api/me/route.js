import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { verifySession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/me — the current identity, from SSO (Entra) or the password fallback.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user && (session.user.email || session.user.name)) {
    const u = session.user;
    return NextResponse.json({
      via: "sso",
      name: u.name || u.email,
      email: u.email || null,
      role: u.role || "Business Owner",
      department: u.department || null,
      jobTitle: u.jobTitle || null,
    });
  }
  const custom = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (custom) return NextResponse.json({ via: "password", name: custom.user || "NESR User", role: null });
  return NextResponse.json({ via: "none" }, { status: 401 });
}
