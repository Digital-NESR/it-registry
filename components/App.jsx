"use client";
/* ===== App shell: store, navigation, role switching, routing ===== */
import { useState, useEffect, useCallback, useMemo } from "react";
import { StoreCtx, useStore } from "./store";
import { Icon, Avatar, Chip } from "./ui";
import { NESR, headOfIT, people as PEOPLE } from "@/lib/schema";
import { fetchApps, saveApp, decideApp } from "./api";
import { Dashboard } from "./Dashboard";
import { Registry } from "./Registry";
import { Approvals } from "./Approvals";
import { AddForm } from "./AddForm";
import { Detail } from "./Detail";
import { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio } from "./TweaksPanel";

const TWEAK_DEFAULTS = {
  accent: ["#307c4c", "#25613b", "#6AAF8E", "#C5E0D2"],
  density: "Compact",
};
const ACCENTS = [
  ["#307c4c", "#25613b", "#6AAF8E", "#C5E0D2"], // NESR green (default)
  ["#0E7490", "#0B5A70", "#5EB6CC", "#CDEAF1"], // petrol teal
  ["#3B5BB5", "#2E4790", "#8BA3E0", "#D6DEF6"], // indigo
  ["#475569", "#33414F", "#94A3B2", "#DBE1E8"], // slate
];

// Access-control roles (SSO-ready: when Azure AD is wired in, the user's name
// and role come from the token instead of these client-side pickers).
const ROLES = ["Business Owner", "Manager", "IT Director"];
const ROLE_DESC = { "Business Owner": "Own applications", "Manager": "Everything", "IT Director": "Approver · all apps" };

// Does this person own the application?
const ownsApp = (app, me) => app.businessOwner === me || app.itOwner === me || app.submittedBy === me;
// Visibility & edit rules per role.
const canSeeApp = (app, role, me) => role !== "Business Owner" || ownsApp(app, me);
const canEditApp = (app, role, me) => role === "Manager" || (role === "Business Owner" && ownsApp(app, me));

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  return { toasts, push, dismiss: id => setToasts(t => t.filter(x => x.id !== id)) };
}

export default function App() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [role, setRole] = useState("IT Director");
  const [me, setMe] = useState(headOfIT);
  const [view, setView] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [prefill, setPrefill] = useState(null); // edit / resubmit data into add form
  const { toasts, push, dismiss } = useToasts();
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // initial load from the database
  const reload = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await fetchApps();
      setApps(data);
    } catch (e) {
      setLoadError(e.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // apply tweaks to CSS variables / body class
  useEffect(() => {
    const root = document.documentElement;
    const [c6, c7, c4, c1] = tw.accent;
    root.style.setProperty("--green-600", c6);
    root.style.setProperty("--green-700", c7);
    root.style.setProperty("--green-400", c4);
    root.style.setProperty("--green-100", c1);
    document.body.classList.toggle("density-comfy", tw.density === "Comfortable");
  }, [tw]);

  // Role-scoped view of the estate. Business Owners only see their own apps.
  const visibleApps = useMemo(() => apps.filter(a => canSeeApp(a, role, me)), [apps, role, me]);
  const canApprove = role === "IT Director";
  const canEdit = useCallback((app) => canEditApp(app, role, me), [role, me]);

  const goDetail = useCallback((id) => { setSelectedId(id); setView("detail"); }, []);
  const pendingCount = visibleApps.filter(a => a.approvalStatus === "Pending").length;

  // mutations (persist to the database, then update local state)
  const submitApp = useCallback(async (data, asDraft) => {
    try {
      const saved = await saveApp(data, { asDraft, me });
      setApps(prev => {
        const exists = prev.some(a => a.id === saved.id);
        return exists ? prev.map(a => a.id === saved.id ? saved : a) : [saved, ...prev];
      });
      return saved;
    } catch (e) {
      push(e.message || "Could not save application", "err");
      return null;
    }
  }, [me, push]);

  const decide = useCallback(async (id, decision, note) => {
    try {
      const saved = await decideApp(id, decision, note, me);
      setApps(prev => prev.map(a => a.id === id ? saved : a));
      return saved;
    } catch (e) {
      push(e.message || "Could not record decision", "err");
      return null;
    }
  }, [push, me]);

  const store = { apps, visibleApps, setApps, role, setRole, me, setMe, view, setView, selectedId, setSelectedId,
    goDetail, submitApp, decide, push, pendingCount, prefill, setPrefill, canApprove, canEdit };

  const selected = apps.find(a => a.id === selectedId);

  return (
    <StoreCtx.Provider value={store}>
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        <NavRail />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopBar />
          <main style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            {loading ? <LoadingState />
              : loadError ? <ErrorState message={loadError} onRetry={reload} />
              : (
                <div key={view + (view === "detail" ? selectedId : "")} className="view-enter" style={{ minHeight: "100%" }}>
                  {view === "dashboard" && <Dashboard />}
                  {view === "registry" && <Registry />}
                  {view === "approvals" && <Approvals />}
                  {view === "add" && <AddForm />}
                  {view === "detail" && selected && <Detail app={selected} />}
                  {view === "detail" && !selected && <div style={{ padding: 40 }}>Application not found.</div>}
                </div>
              )}
          </main>
        </div>
      </div>
      <Toasts toasts={toasts} dismiss={dismiss} />
      <TweaksPanel>
        <TweakSection label="Branding" />
        <TweakColor label="Accent" value={tw.accent} options={ACCENTS} onChange={v => setTweak("accent", v)} />
        <TweakSection label="Registry" />
        <TweakRadio label="Table density" value={tw.density} options={["Compact", "Comfortable"]} onChange={v => setTweak("density", v)} />
      </TweaksPanel>
    </StoreCtx.Provider>
  );
}

/* ---------- loading / error ---------- */
function LoadingState() {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--text-faint)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--green-600)", display: "grid",
          placeItems: "center", color: "#fff", fontWeight: 700, margin: "0 auto 12px", animation: "popIn 1.1s ease-in-out infinite alternate" }}>N</div>
        <div style={{ fontSize: 13 }}>Loading the registry…</div>
      </div>
    </div>
  );
}
function ErrorState({ message, onRetry }) {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%", padding: 40 }}>
      <div style={{ textAlign: "center", maxWidth: 460 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--st-reject-bg)", color: "var(--st-reject)",
          display: "inline-grid", placeItems: "center", marginBottom: 14 }}><Icon name="alert" size={22} /></span>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Couldn’t reach the database</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-soft)" }}>{message}</p>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-faint)" }}>
          Check that <code>DATABASE_URL</code> is set and that the schema has been seeded
          (<code>npm run db:seed</code>).
        </p>
        <button onClick={onRetry} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px",
          borderRadius: 8, border: "none", background: "var(--green-600)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
          <Icon name="cycle" size={15} /> Retry
        </button>
      </div>
    </div>
  );
}

/* ---------- left navigation rail ---------- */
function NavRail() {
  const { view, setView, pendingCount } = useStore();
  const items = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "registry", label: "Application Registry", icon: "grid" },
    { id: "approvals", label: "Approvals", icon: "inbox", badge: pendingCount },
    { id: "add", label: "Add Application", icon: "plus" },
  ];
  return (
    <nav style={{
      width: "var(--rail-w)", background: "var(--ink)", color: "#D8DAD6", flexShrink: 0,
      display: "flex", flexDirection: "column", padding: "0 0 14px" }}>
      <div style={{ padding: "22px 20px 18px", display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fff",
          display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nesr-logo.png" alt="NESR" style={{ width: 28, height: 28, objectFit: "contain" }} />
        </div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "#fff", letterSpacing: "-.01em" }}>NESR</div>
          <div style={{ fontSize: 11, color: "#8FA89A", fontWeight: 500, letterSpacing: ".03em" }}>IT Registry</div>
        </div>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,.07)", margin: "0 16px 12px" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 12px" }}>
        {items.map(it => {
          const active = view === it.id;
          return (
            <button key={it.id} onClick={() => setView(it.id)} className="focusable" style={{
              display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 8,
              border: "none", background: active ? "rgba(106,175,142,.16)" : "transparent",
              color: active ? "#fff" : "#AFB6AF", fontSize: 13.5, fontWeight: active ? 600 : 500,
              textAlign: "left", position: "relative", transition: "background .15s, color .15s" }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,.05)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              {active && <span style={{ position: "absolute", left: -12, top: 8, bottom: 8, width: 3, borderRadius: 3, background: "var(--green-400)" }} />}
              <Icon name={it.icon} size={18} style={{ color: active ? "var(--green-400)" : "inherit" }} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.badge > 0 && (
                <span style={{ background: active ? "var(--green-400)" : "#3A3A37", color: active ? "var(--ink)" : "#D8DAD6",
                  fontSize: 11, fontWeight: 700, minWidth: 19, height: 19, borderRadius: 99, display: "grid",
                  placeItems: "center", padding: "0 5px" }}>{it.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />
      <RoleSwitcher />
      <div style={{ margin: "12px 16px 0", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.07)",
        fontSize: 10, lineHeight: 1.4, color: "#6E7A70", textAlign: "center" }}>
        National Energy Services Reunited Corp.
      </div>
    </nav>
  );
}

/* ---------- role switcher ---------- */
const darkSelect = {
  width: "100%", padding: "7px 9px", borderRadius: 7, fontSize: 12, fontWeight: 600, fontFamily: "inherit",
  background: "rgba(0,0,0,.28)", color: "#fff", border: "1px solid rgba(255,255,255,.1)", appearance: "none",
};
function RoleSwitcher() {
  const { role, setRole, me, setMe, push } = useStore();
  const logout = async () => {
    try { await fetch("/api/logout", { method: "POST" }); } catch { /* ignore */ }
    window.location.href = "/login";
  };
  const people = [...new Set(PEOPLE)].sort();
  return (
    <div style={{ margin: "10px 16px 0", padding: "12px", background: "rgba(255,255,255,.04)", borderRadius: 11,
      border: "1px solid rgba(255,255,255,.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
        <Avatar name={me} size={32} />
        <div style={{ lineHeight: 1.2, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me}</div>
          <div style={{ fontSize: 11, color: "#8FA89A" }}>{role}</div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: "#7E867E", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
        <Icon name="switch" size={12} /> View as <span style={{ color: "#5E6B63", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(until SSO)</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <select value={me} onChange={(e) => setMe(e.target.value)} style={darkSelect} title="Who am I">
          {people.map((p) => <option key={p} value={p} style={{ color: "#000" }}>{p}</option>)}
        </select>
        <select value={role} onChange={(e) => { setRole(e.target.value); push(`Now viewing as ${e.target.value}`, "info"); }} style={darkSelect} title="Role">
          {ROLES.map((r) => <option key={r} value={r} style={{ color: "#000" }}>{r} — {ROLE_DESC[r]}</option>)}
        </select>
      </div>
      <button onClick={logout} style={{ marginTop: 10, width: "100%", display: "flex", alignItems: "center",
        justifyContent: "center", gap: 7, padding: "7px 4px", borderRadius: 7, border: "none",
        background: "transparent", color: "#8FA89A", fontSize: 11.5, fontWeight: 600 }}
        onMouseEnter={e => e.currentTarget.style.color = "#fff"}
        onMouseLeave={e => e.currentTarget.style.color = "#8FA89A"}>
        <Icon name="logout" size={13} /> Sign out
      </button>
    </div>
  );
}

/* ---------- top bar ---------- */
const VIEW_META = {
  dashboard: { t: "Dashboard", s: "Portfolio analytics across the application estate" },
  registry: { t: "Application Registry", s: "The single source of truth for every IT application" },
  approvals: { t: "Approvals", s: "New applications awaiting Head of IT sign-off" },
  add: { t: "Add Application", s: "Register a new application for approval" },
  detail: { t: "Application Detail", s: "" },
};
function TopBar() {
  const { view, role } = useStore();
  const meta = VIEW_META[view] || VIEW_META.dashboard;
  return (
    <header style={{ height: 64, flexShrink: 0, background: "var(--surface)", borderBottom: "1px solid var(--line)",
      display: "flex", alignItems: "center", padding: "0 26px", gap: 18, zIndex: 5 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-.01em" }}>{meta.t}</h1>
        {meta.s && <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>{meta.s}</div>}
      </div>
      <div style={{ flex: 1 }} />
      <button title="Notifications" className="focusable" style={iconBtn}>
        <Icon name="bell" size={18} />
        <span style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: 99, background: "var(--st-sunset)", border: "1.5px solid #fff" }} />
      </button>
      <div style={{ height: 26, width: 1, background: "var(--line)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Chip color={role === "IT Director" ? "--st-active" : role === "Manager" ? "--st-dev" : "--st-review"}
          bg={role === "IT Director" ? "--st-active-bg" : role === "Manager" ? "--st-dev-bg" : "--st-review-bg"}>
          {role}
        </Chip>
      </div>
    </header>
  );
}
const iconBtn = { position: "relative", width: 36, height: 36, borderRadius: 9, border: "1px solid var(--line)",
  background: "var(--surface)", color: "var(--text-soft)", display: "grid", placeItems: "center" };

/* ---------- toasts ---------- */
function Toasts({ toasts, dismiss }) {
  return (
    <div style={{ position: "fixed", bottom: 22, right: 22, display: "flex", flexDirection: "column", gap: 10, zIndex: 200 }}>
      {toasts.map(t => {
        const c = t.kind === "err" ? "--st-reject" : t.kind === "info" ? "--st-dev" : "--st-active";
        return (
          <div key={t.id} onClick={() => dismiss(t.id)} style={{
            display: "flex", alignItems: "center", gap: 11, background: "var(--ink)", color: "#fff",
            padding: "11px 15px", borderRadius: 11, boxShadow: "var(--shadow-lg)", cursor: "pointer",
            minWidth: 260, maxWidth: 380, animation: "popIn .26s cubic-bezier(.2,.7,.3,1) both" }}>
            <span style={{ width: 22, height: 22, borderRadius: 99, background: `var(${c})`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name={t.kind === "err" ? "x" : t.kind === "info" ? "switch" : "check"} size={13} strokeWidth={2.4} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}
