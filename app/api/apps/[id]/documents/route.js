import { NextResponse } from "next/server";
import { ensureSchema, getApp, insertDocument, logAudit } from "@/lib/db";
import { getActor } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB per file

// POST /api/apps/:id/documents — upload one or more files (multipart/form-data)
export async function POST(req, { params }) {
  try {
    const id = Number(params?.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    await ensureSchema();
    if (!(await getApp(id))) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const form = await req.formData();
    const files = form.getAll("files").filter((f) => typeof f === "object" && f.arrayBuffer);
    const uploadedBy = form.get("me") || "Unknown";
    if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

    const saved = [];
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      if (buf.length > MAX_BYTES) {
        return NextResponse.json({ error: `${file.name} exceeds the 15 MB limit` }, { status: 413 });
      }
      saved.push(await insertDocument({
        applicationId: id,
        filename: file.name || "document",
        contentType: file.type || "application/octet-stream",
        size: buf.length,
        data: buf,
        uploadedBy: String(uploadedBy),
      }));
    }
    const actor = await getActor(String(uploadedBy));
    await logAudit({ ...actor, action: "document.upload", entityType: "application", entityId: id,
      summary: `${actor.actorName} uploaded ${saved.length} document${saved.length > 1 ? "s" : ""}` });
    return NextResponse.json({ documents: saved }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
