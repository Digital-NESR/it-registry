import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/login — exchange the static access password for a session cookie.
// TODO(auth): replace with Microsoft SSO (NextAuth.js + Azure AD) when ready.
export async function POST(req) {
  try {
    const { password } = await req.json();
    const expected = process.env.LOGIN_PASSWORD || "NESR2026";
    if (!password || password !== expected) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
    const token = await createSession({ method: "password", user: "NESR User" });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12, // 12h
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
