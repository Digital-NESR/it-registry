import { NextResponse } from "next/server";
import { ensureSchema, getApp, updateApp } from "@/lib/db";
import { today, headOfIT } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/apps/:id/decision — approve or reject a pending application
export async function POST(req, { params }) {
  try {
    const id = Number(params?.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const { decision, note, approver } = await req.json();
    if (!["Approved", "Rejected"].includes(decision)) {
      return NextResponse.json({ error: "decision must be 'Approved' or 'Rejected'" }, { status: 400 });
    }

    await ensureSchema();
    const app = await getApp(id);
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // TODO(auth): once auth is wired in (see lib/auth.js), require the caller
    // to hold the "Head of IT" role here rather than trusting `approver`.
    const rec = { ...app };
    delete rec.id;
    rec.approvalStatus = decision;
    rec.approvedBy = approver || headOfIT;
    rec.decisionDate = today;
    rec.decisionNote = note || "";
    if (decision === "Approved" && rec.status === "Under Development") rec.status = "Active";

    return NextResponse.json(await updateApp(id, rec));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
