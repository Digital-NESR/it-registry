/* Server-side identity & permission resolution.
   Lives in server/ (not the type:module lib/) so its next-auth import keeps
   standard CommonJS interop. Role is authoritative from the database
   (admins from env > user_roles > Business Owner), factoring time-bound
   approval delegation. */
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options.js";
import { getUserRecord, getApprover } from "../lib/db.js";

const sameEmail = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Admins from env: ADMIN_EMAILS is canonical; SYSTEM_ADMIN_EMAILS kept for
    back-compat. Anyone listed can open /admin and has full portal access. */
export function adminEmails() {
  return [process.env.ADMIN_EMAILS, process.env.SYSTEM_ADMIN_EMAILS]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
export function isAdminEmail(email) {
  return !!email && adminEmails().includes(email.toLowerCase());
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req) {
  try {
    const xff = req.headers.get("x-forwarded-for");
    return (xff ? xff.split(",")[0].trim() : null) || req.headers.get("x-real-ip") || null;
  } catch {
    return null;
  }
}

/** Is the delegate window currently open? (open-ended if dates omitted) */
function delegationActive(approver) {
  if (!approver?.delegateEmail) return false;
  const today = new Date().toISOString().slice(0, 10);
  const startOk = !approver.delegateStart || String(approver.delegateStart).slice(0, 10) <= today;
  const endOk = !approver.delegateEnd || today <= String(approver.delegateEnd).slice(0, 10);
  return startOk && endOk;
}

/** Resolve full identity + permissions for an SSO email. */
export async function resolveIdentity(email, fallbackName) {
  const rec = await getUserRecord(email);
  const admin = isAdminEmail(email);
  const role = admin ? "System Admin" : rec?.role || "Business Owner";
  const approver = await getApprover();
  const isActiveDelegate = delegationActive(approver) && sameEmail(approver.delegateEmail, email);
  const canApprove = admin || role === "IT Director" || isActiveDelegate;
  const canEditAll = admin || role === "Manager";
  const scope = admin || role === "IT Director" || role === "Manager" ? "all" : "own";
  return {
    email,
    name: fallbackName || rec?.displayName || email,
    jobTitle: rec?.jobTitle || null,
    photo: rec?.photo || null,
    role,
    isAdmin: admin,
    canApprove,
    canEditAll,
    scope,
    isDelegate: isActiveDelegate,
  };
}

/** The acting user for audit/authorization (SSO only now). */
export async function getActor(req, fallbackName) {
  const session = await getServerSession(authOptions);
  const ip = req ? clientIp(req) : null;
  if (session?.user?.email) {
    return { actorEmail: session.user.email, actorName: session.user.name || session.user.email, ip };
  }
  return { actorEmail: null, actorName: fallbackName || "Unknown", ip };
}

/** Admin gate for the /admin page and admin APIs — SSO email must be an admin. */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  return { ok: isAdminEmail(email), email: email || null };
}
