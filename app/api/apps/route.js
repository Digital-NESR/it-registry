import { NextResponse } from "next/server";
import { ensureSchema, listApps, insertApp, patchApp, getApp, reconcileLinks, logAudit } from "@/lib/db";
import { getActor } from "@/server/identity";
import { persistedFieldKeys, fieldByKey, today } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keep only known application fields from an arbitrary request body. */
export function pickFields(body) {
  const rec = { name: body.name ?? "" };
  for (const k of persistedFieldKeys) {
    const f = fieldByKey[k];
    const isArr = f && (f.multi || f.apps);
    rec[k] = body[k] ?? (isArr ? [] : "");
    if (isArr && !Array.isArray(rec[k])) rec[k] = rec[k] ? [rec[k]] : [];
  }
  // TCO is always License + Maintenance (never taken from the client).
  rec.tco = (Number(rec.annualLicenseCost) || 0) + (Number(rec.annualMaintCost) || 0);
  return rec;
}
export function deriveAlias(name) {
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

    // Workflow metadata. TODO(auth): derive submitter from the session.
    rec.approvalStatus = body.asDraft ? "Draft" : "Pending";
    rec.submittedBy = body.me || "Unknown";
    rec.submittedDate = today;
    rec.approvedBy = "";
    rec.decisionDate = "";
    rec.decisionNote = "";

    let saved = await insertApp(rec);
    if (!saved.appId) {
      saved = await patchApp(saved.id, { appId: "NESR-APP-" + String(1000 + saved.id * 7).slice(0, 4) });
    }
    await reconcileLinks(saved);
    const actor = await getActor(req, body.me);
    await logAudit({ ...actor, action: body.asDraft ? "application.draft" : "application.create",
      entityType: "application", entityId: saved.id,
      summary: `${actor.actorName} ${body.asDraft ? "saved draft" : "submitted"} “${saved.name}”` });
    return NextResponse.json(await getApp(saved.id), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
