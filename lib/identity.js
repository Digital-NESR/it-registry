/* Server-side identity & permission resolution.
   Role is authoritative from the database (system admins from env > user_roles
   > Business Owner default), factoring time-bound approval delegation. */
import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options.js";
import { getUserRecord, getApprover } from "./db.js";

const sameEmail = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export function systemAdminEmails() {
  return (process.env.SYSTEM_ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
export function isSystemAdminEmail(email) {
  return !!email && systemAdminEmails().includes(email.toLowerCase());
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
  const admin = isSystemAdminEmail(email);
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
    role,
    isAdmin: admin,
    canApprove,
    canEditAll,
    scope,
    isDelegate: isActiveDelegate,
  };
}

/** The acting user for audit/authorization, from SSO session or password fallback. */
export async function getActor(fallbackName) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    return { actorEmail: session.user.email, actorName: session.user.name || session.user.email, via: "sso" };
  }
  return { actorEmail: null, actorName: fallbackName || "NESR User (password)", via: "password" };
}

/** Admin gate for the /admin page and admin APIs. Password fallback = break-glass admin. */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email) return { ok: isSystemAdminEmail(session.user.email), via: "sso", email: session.user.email };
  // No SSO session — the only other way past middleware is the password cookie,
  // which is the bootstrap/break-glass admin.
  return { ok: true, via: "password", email: null };
}
