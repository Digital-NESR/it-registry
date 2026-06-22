import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth-options";
import { verifySession, SESSION_COOKIE } from "@/lib/session";
import { ensureSchema } from "@/lib/db";
import { resolveIdentity } from "@/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/me — the current identity + permissions, from SSO (Entra) or password.
export async function GET() {
  try {
    await ensureSchema();
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const id = await resolveIdentity(session.user.email, session.user.name);
      return NextResponse.json({ via: "sso", ...id, jobTitle: session.user.jobTitle || id.jobTitle });
    }
    const custom = await verifySession(cookies().get(SESSION_COOKIE)?.value);
    if (custom) {
      // Break-glass password access = full system admin; manual switcher drives view.
      return NextResponse.json({ via: "password", name: custom.user || "NESR User", role: null, isAdmin: true });
    }
    return NextResponse.json({ via: "none" }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
