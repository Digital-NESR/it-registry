import { NextResponse } from "next/server";
import { getDocument, deleteDocument } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/documents/:docId — download the file
export async function GET(_req, { params }) {
  try {
    const id = Number(params?.docId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const doc = await getDocument(id);
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(doc.data, {
      headers: {
        "Content-Type": doc.content_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
        "Content-Length": String(doc.size ?? doc.data.length),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/documents/:docId
export async function DELETE(_req, { params }) {
  try {
    const id = Number(params?.docId);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    const ok = await deleteDocument(id);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
