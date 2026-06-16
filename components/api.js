"use client";
/* Thin client wrapper around the /api/apps REST endpoints. */

async function jsonOrThrow(res) {
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch { /* ignore */ }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchApps() {
  return jsonOrThrow(await fetch("/api/apps", { cache: "no-store" }));
}

/** Create or update an application. `me` is the current (toggled) identity. */
export async function saveApp(data, { asDraft, me }) {
  const isUpdate = !!data.id;
  const res = await fetch(isUpdate ? `/api/apps/${data.id}` : "/api/apps", {
    method: isUpdate ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, asDraft, me }),
  });
  return jsonOrThrow(res);
}

/** Approve or reject an application. */
export async function decideApp(id, decision, note, approver) {
  const res = await fetch(`/api/apps/${id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, note, approver }),
  });
  return jsonOrThrow(res);
}
