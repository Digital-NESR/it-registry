"use client";
/* ===== Admin Console (/admin) — Roles · Analytics · Audit Logs ===== */
import { useState, useEffect, useCallback } from "react";
import { Icon, fmtMoney, fmtDate, Avatar, primaryBtn, ghostBtn } from "./ui";
import { EmployeeSelect } from "./EmployeeSelect";

const ROLE_OPTIONS = ["Business Owner", "Manager", "IT Director"];
const ACTION_LABELS = {
  "auth.login": "Sign in", "auth.logout": "Sign out", "application.create": "App submitted", "application.draft": "Draft saved",
  "application.update": "App updated", "application.approve": "App approved", "application.reject": "App rejected",
  "application.delete": "App deleted", "document.upload": "Document uploaded", "role.update": "Role changed",
  "delegation.set": "Delegation changed",
};
const api = (u, opts) => fetch(u, opts).then((r) => r.json());

const TABS = [
  { id: "roles", label: "Roles", icon: "user" },
  { id: "analytics", label: "Analytics", icon: "trend" },
  { id: "audit", label: "Audit Logs", icon: "doc" },
];

export default function AdminConsole() {
  const [tab, setTab] = useState("roles");
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: "var(--font)" }}>
      {/* sub-sidebar */}
      <nav style={{ width: 230, background: "var(--ink)", color: "#D8DAD6", flexShrink: 0, display: "flex", flexDirection: "column", padding: "0 0 14px" }}>
        <div style={{ padding: "22px 20px 18px", display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nesr-logo.png" alt="NESR" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: "#fff" }}>NESR</div>
            <div style={{ fontSize: 11, color: "#8FA89A", fontWeight: 500 }}>Admin Console</div>
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,.07)", margin: "0 16px 12px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 12px" }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 8, border: "none",
                background: active ? "rgba(106,175,142,.16)" : "transparent", color: active ? "#fff" : "#AFB6AF",
                fontSize: 13.5, fontWeight: active ? 600 : 500, textAlign: "left", cursor: "pointer", position: "relative" }}>
                {active && <span style={{ position: "absolute", left: -12, top: 8, bottom: 8, width: 3, borderRadius: 3, background: "var(--green-400)" }} />}
                <Icon name={t.icon} size={18} style={{ color: active ? "var(--green-400)" : "inherit" }} />
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <a href="/" style={{ margin: "0 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          padding: "9px", borderRadius: 8, background: "rgba(255,255,255,.05)", color: "#D8DAD6", textDecoration: "none", fontSize: 12.5, fontWeight: 600 }}>
          <Icon name="chevLeft" size={14} /> Back to registry
        </a>
      </nav>

      {/* main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ height: 64, flexShrink: 0, background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 26px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{TABS.find((t) => t.id === tab).label}</h1>
            <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>System administration · NESR IT Registry</div>
          </div>
        </header>
        <main style={{ flex: 1, overflow: "auto", padding: "24px 26px 50px" }}>
          {tab === "roles" && <RolesPanel />}
          {tab === "analytics" && <AnalyticsPanel />}
          {tab === "audit" && <AuditPanel />}
        </main>
      </div>
    </div>
  );
}

const card = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, boxShadow: "var(--shadow-sm)" };
const inputS = { padding: "8px 11px", borderRadius: 8, border: "1px solid var(--line-strong)", fontSize: 13, fontFamily: "inherit", background: "var(--surface)" };
const th = { textAlign: "left", padding: "10px 14px", fontSize: 11.5, fontWeight: 600, color: "var(--text-soft)", borderBottom: "1px solid var(--line-strong)", background: "var(--surface-2)", whiteSpace: "nowrap" };
const td = { padding: "10px 14px", fontSize: 12.5, borderBottom: "1px solid var(--line)", verticalAlign: "middle" };

/* ---------- Roles ---------- */
function RolesPanel() {
  const [roles, setRoles] = useState([]);
  const [delegation, setDelegation] = useState(null);
  const [del, setDel] = useState({ delegateEmail: "", start: "", end: "" });
  const [newUser, setNewUser] = useState({ email: "", role: "Manager" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [r, d] = await Promise.all([api("/api/admin/roles"), api("/api/admin/delegation")]);
    if (Array.isArray(r)) setRoles(r);
    setDelegation(d);
    if (d) setDel({ delegateEmail: d.delegateEmail || "", start: (d.delegateStart || "").slice(0, 10), end: (d.delegateEnd || "").slice(0, 10) });
  }, []);
  useEffect(() => { load(); }, [load]);

  const changeRole = async (email, role) => {
    setBusy(true);
    const r = await api("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
    if (Array.isArray(r)) setRoles(r);
    setBusy(false); setMsg(`Updated ${email} → ${role}`); setTimeout(() => setMsg(""), 2500);
  };
  const addUser = async () => {
    if (!newUser.email.trim()) return;
    await changeRole(newUser.email.trim().toLowerCase(), newUser.role);
    setNewUser({ email: "", role: "Manager" });
  };
  const saveDelegation = async (clear) => {
    setBusy(true);
    const body = clear ? { delegateEmail: "" } : del;
    const d = await api("/api/admin/delegation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setDelegation(d);
    if (clear) setDel({ delegateEmail: "", start: "", end: "" });
    setBusy(false); setMsg(clear ? "Delegation cleared" : "Delegation saved"); setTimeout(() => setMsg(""), 2500);
  };

  const today = new Date().toISOString().slice(0, 10);
  const delActive = delegation?.delegateEmail && (!delegation.delegateStart || String(delegation.delegateStart).slice(0, 10) <= today) && (!delegation.delegateEnd || today <= String(delegation.delegateEnd).slice(0, 10));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1000 }}>
      {msg && <div style={{ ...card, padding: "10px 16px", background: "var(--st-active-bg)", color: "var(--st-active)", fontWeight: 600, fontSize: 12.5 }}>{msg}</div>}

      {/* Delegation */}
      <section style={card}>
        <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>IT Director approval delegation</h3>
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--text-soft)" }}>
          Current approver: <b>{delegation?.displayName || delegation?.email || "—"}</b>
          {delegation?.delegateEmail && (
            <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 99, fontSize: 11.5, fontWeight: 600,
              background: delActive ? "var(--st-active-bg)" : "var(--st-review-bg)", color: delActive ? "var(--st-active)" : "var(--st-review)" }}>
              {delActive ? "Delegated now" : "Delegation scheduled"} → {delegation.delegateEmail}
            </span>
          )}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <Labeled label="Delegate (search directory)">
            <EmployeeSelect value={del.delegateEmail} onChange={(v) => setDel({ ...del, delegateEmail: v })} field="email" placeholder="Search employee…" />
          </Labeled>
          <Labeled label="From"><input type="date" style={inputS} value={del.start} onChange={(e) => setDel({ ...del, start: e.target.value })} /></Labeled>
          <Labeled label="Until"><input type="date" style={inputS} value={del.end} onChange={(e) => setDel({ ...del, end: e.target.value })} /></Labeled>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => saveDelegation(false)} disabled={busy || !del.delegateEmail} style={{ ...primaryBtn, opacity: del.delegateEmail ? 1 : 0.5 }}>Save</button>
            {delegation?.delegateEmail && <button onClick={() => saveDelegation(true)} disabled={busy} style={ghostBtn}>Clear</button>}
          </div>
        </div>
      </section>

      {/* Users & roles */}
      <section style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Users & roles</h3>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{roles.length} users · Managers see/edit all · IT Director approves · others see their own</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input style={{ ...inputS, width: 220 }} placeholder="add email…" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            <select style={inputS} value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>{ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}</select>
            <button onClick={addUser} disabled={busy} style={primaryBtn}><Icon name="plus" size={14} /> Set</button>
          </div>
        </div>
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>User</th><th style={th}>Email</th><th style={th}>Job Title</th><th style={th}>Role</th></tr></thead>
            <tbody>
              {roles.map((u) => (
                <tr key={u.email}>
                  <td style={td}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Avatar name={u.displayName || u.email} size={24} />{u.displayName || "—"}</span></td>
                  <td style={td}><span className="num" style={{ fontSize: 12 }}>{u.email}</span></td>
                  <td style={td}>{u.jobTitle || <span style={{ color: "var(--text-faint)" }}>—</span>}</td>
                  <td style={td}>
                    <select value={u.role} onChange={(e) => changeRole(u.email, e.target.value)} disabled={busy}
                      style={{ ...inputS, padding: "5px 8px", fontWeight: 600,
                        color: u.role === "IT Director" ? "var(--st-active)" : u.role === "Manager" ? "var(--st-dev)" : "var(--text)" }}>
                      {ROLE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && <tr><td style={{ ...td, textAlign: "center", color: "var(--text-faint)", padding: 30 }} colSpan={4}>No users yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
function Labeled({ label, children }) {
  return (<div><div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-soft)", marginBottom: 5 }}>{label}</div>{children}</div>);
}

/* ---------- Analytics ---------- */
function AnalyticsPanel() {
  const [a, setA] = useState(null);
  useEffect(() => { api("/api/admin/analytics").then(setA).catch(() => {}); }, []);
  if (!a) return <div style={{ color: "var(--text-faint)" }}>Loading analytics…</div>;
  const Kpi = ({ label, value }) => (
    <div style={{ ...card, padding: "16px 18px" }}>
      <div style={{ fontSize: 11.5, color: "var(--text-soft)", fontWeight: 600 }}>{label}</div>
      <div className="num" style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
  const Breakdown = ({ title, rows, keyName = "k" }) => (
    <section style={card}>
      <h3 style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 700 }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((r) => {
          const max = Math.max(...rows.map((x) => x.n), 1);
          return (
            <div key={r[keyName]}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}><span>{r[keyName] || "—"}</span><span className="num" style={{ fontWeight: 600 }}>{r.n}</span></div>
              <div style={{ height: 7, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}><div style={{ width: (r.n / max * 100) + "%", height: "100%", background: "var(--green-600)" }} /></div>
            </div>
          );
        })}
        {rows.length === 0 && <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>No data.</div>}
      </div>
    </section>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1000 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
        <Kpi label="Applications" value={a.totalApps} />
        <Kpi label="Pending Approval" value={a.pending} />
        <Kpi label="Annual TCO" value={fmtMoney(a.totalTco)} />
        <Kpi label="Users" value={a.users} />
        <Kpi label="Audit events (7d)" value={a.auditLast7d} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Breakdown title="By lifecycle status" rows={a.byStatus} keyName="status" />
        <Breakdown title="By approval status" rows={a.byApproval} />
        <Breakdown title="By department (top 10)" rows={a.byDepartment} />
        <Breakdown title="Users by role" rows={a.byRole} />
      </div>
    </div>
  );
}

/* ---------- Audit ---------- */
function AuditPanel() {
  const [rows, setRows] = useState([]);
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams(); q.set("limit", "400"); if (actor) q.set("actor", actor); if (action) q.set("action", action);
    const r = await api("/api/admin/audit?" + q.toString());
    setRows(Array.isArray(r) ? r : []); setLoading(false);
  }, [actor, action]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1000 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input style={{ ...inputS, width: 240 }} placeholder="Filter by actor email…" value={actor} onChange={(e) => setActor(e.target.value)} />
        <select style={inputS} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--text-faint)", alignSelf: "center" }} className="num">{rows.length} events</span>
      </div>
      <section style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflow: "auto", maxHeight: "70vh" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>When</th><th style={th}>Actor</th><th style={th}>Action</th><th style={th}>Details</th><th style={th}>IP</th></tr></thead>
            <tbody>
              {loading && <tr><td style={{ ...td, textAlign: "center", color: "var(--text-faint)", padding: 30 }} colSpan={5}>Loading…</td></tr>}
              {!loading && rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...td, whiteSpace: "nowrap" }}><span className="num" style={{ fontSize: 11.5 }}>{new Date(r.ts).toLocaleString("en-GB")}</span></td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <div style={{ fontWeight: 600 }}>{r.actorName || "—"}</div>
                    {r.actorEmail && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{r.actorEmail}</div>}
                  </td>
                  <td style={td}><span style={{ padding: "2px 8px", borderRadius: 99, background: "var(--surface-2)", border: "1px solid var(--line)", fontSize: 11.5, fontWeight: 600 }}>{ACTION_LABELS[r.action] || r.action}</span></td>
                  <td style={{ ...td, color: "var(--text-soft)" }}>{r.summary}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}><span className="num" style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{r.ip || "—"}</span></td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td style={{ ...td, textAlign: "center", color: "var(--text-faint)", padding: 30 }} colSpan={5}>No audit events.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
