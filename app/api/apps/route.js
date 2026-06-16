import { NextResponse } from "next/server";
import { ensureSchema, listApps, insertApp, updateApp } from "@/lib/db";
import { fieldKeys, today } from "@/lib/schema";

// pg requires the Node.js runtime (not Edge). Never cache — always hit the DB.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keep only known application fields from an arbitrary request body. */
function pickFields(body) {
  const rec = {};
  for (const k of ["name", ...fieldKeys]) rec[k] = body[k] ?? "";
  return rec;
}

function deriveAlias(name) {
  return String(name || "").split(/[\s(]/)[0].toUpperCase().slice(0, 6);
}

// GET /api/apps — list every application
export async function GET() {
  try {
    await ensureSchema();
    return NextResponse.json(await listApps());
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/apps — register a new application (Pending, or Draft)
export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json();
    const rec = pickFields(body);
    if (!String(rec.name).trim()) {
      return NextResponse.json({ error: "Application name is required" }, { status: 400 });
    }
    if (!rec.alias) rec.alias = deriveAlias(rec.name);
    if (!rec.status) rec.status = "Under Development";

    // Workflow metadata.
    // TODO(auth): once real auth is wired in (see lib/auth.js), derive the
    // submitter identity from the authenticated session instead of body.me.
    rec.approvalStatus = body.asDraft ? "Draft" : "Pending";
    rec.submittedBy = body.me || "Unknown";
    rec.submittedDate = today;
    rec.approvedBy = "";
    rec.decisionDate = "";
    rec.decisionNote = "";

    const saved = await insertApp(rec);

    // Mint a stable App ID from the new database id when none was supplied.
    if (!saved.appId) {
      const appId = "NESR-APP-" + String(1000 + saved.id * 7).slice(0, 4);
      const updated = await updateApp(saved.id, { ...saved, appId });
      return NextResponse.json(updated, { status: 201 });
    }
    return NextResponse.json(saved, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
