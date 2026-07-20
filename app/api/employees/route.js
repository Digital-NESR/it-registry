import { NextResponse } from "next/server";
import { searchEmployees } from "@/lib/emp-db";

// SSO-protected by middleware. Type-ahead search over the Azure AD directory.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rows = await searchEmployees(searchParams.get("q") || "", searchParams.get("limit"));
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
