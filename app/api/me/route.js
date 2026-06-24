import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth-options";
import { ensureSchema } from "@/lib/db";
import { resolveIdentity } from "@/server/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/me — the current identity + permissions (Microsoft Entra SSO).
export async function GET() {
  try {
    await ensureSchema();
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const id = await resolveIdentity(session.user.email, session.user.name);
      return NextResponse.json({ via: "sso", ...id, jobTitle: session.user.jobTitle || id.jobTitle });
    }
    return NextResponse.json({ via: "none" }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
