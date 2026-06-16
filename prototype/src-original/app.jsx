/* ===== App shell: store, navigation, role switching, routing ===== */

const StoreCtx = React.createContext(null);
const useStore = () => React.useContext(StoreCtx);

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": ["#2A7E4F", "#226841", "#6AAF8E", "#C5E0D2"],
  "density": "Compact"
}/*EDITMODE-END*/;
const ACCENTS = [
  ["#2A7E4F", "#226841", "#6AAF8E", "#C5E0D2"], // NESR green (default)
  ["#0E7490", "#0B5A70", "#5EB6CC", "#CDEAF1"], // petrol teal
  ["#3B5BB5", "#2E4790", "#8BA3E0", "#D6DEF6"], // indigo
  ["#475569", "#33414F", "#94A3B2", "#DBE1E8"], // slate
];

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  return { toasts, push, dismiss: id => setToasts(t => t.filter(x => x.id !== id)) };
}

function App() {
  const [apps, setApps] = useState(() => window.NESR.apps.map(a => ({ ...a })));
  const [role, setRole] = useState("Submitter");
  const [view, setView] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [prefill, setPrefill] = useState(null); // edit / resubmit data into add form
  const { toasts, push, dismiss } = useToasts();
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);

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

  const me = role === "Head of IT" ? window.NESR.headOfIT : "Dana Aboud";

  const goDetail = useCallback((id) => { setSelectedId(id); setView("detail"); }, []);
  const pendingCount = apps.filter(a => a.approvalStatus === "Pending").length;

  // mutations
  const submitApp = useCallback((data, asDraft) => {
    setApps(prev => {
      const exists = prev.find(a => a.id === data.id);
      const rec = { ...data, approvalStatus: asDraft ? "Draft" : "Pending",
        submittedBy: me, submittedDate: window.NESR.today, approvedBy: "", decisionDate: "", decisionNote: "" };
      if (exists) return prev.map(a => a.id === data.id ? { ...a, ...rec } : a);
      const id = Math.max(...prev.map(a => a.id)) + 1;
      return [{ ...rec, id }, ...prev];
    });
  }, [me]);

  const decide = useCallback((id, decision, note) => {
    setApps(prev => prev.map(a => a.id === id ? {
      ...a, approvalStatus: decision, approvedBy: window.NESR.headOfIT,
      decisionDate: window.NESR.today, decisionNote: note || "",
      status: decision === "Approved" ? (a.status === "Under Development" ? "Active" : a.status) : a.status,
    } : a));
  }, []);

  const store = { apps, setApps, role, setRole, view, setView, selectedId, setSelectedId,
    goDetail, submitApp, decide, push, me, pendingCount, prefill, setPrefill };

  const selected = apps.find(a => a.id === selectedId);

  return (
    <StoreCtx.Provider value={store}>
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        <NavRail />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopBar />
          <main style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            <div key={view + (view === "detail" ? selectedId : "")} className="view-enter" style={{ minHeight: "100%" }}>
              {view === "dashboard" && <Dashboard />}
              {view === "registry" && <Registry />}
              {view === "approvals" && <Approvals />}
              {view === "add" && <AddForm />}
              {view === "detail" && selected && <Detail app={selected} />}
              {view === "detail" && !selected && <div style={{ padding: 40 }}>Application not found.</div>}
            </div>
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

/* ---------- left navigation rail ---------- */
function NavRail() {
  const { view, setView, role, pendingCount } = useStore();
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
        <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--green-600)",
          display: "grid", placeItems: "center", boxShadow: "0 0 0 1px rgba(255,255,255,.08) inset" }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: "#fff", letterSpacing: "-.02em" }}>N</span>
        </div>
        <div style={{ lineHeight: 1.1 }}>
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
    </nav>
  );
}

/* ---------- role switcher ---------- */
function RoleSwitcher() {
  const { role, setRole, me, push } = useStore();
  const roles = ["Submitter", "Head of IT"];
  return (
    <div style={{ margin: "10px 16px 0", padding: "12px", background: "rgba(255,255,255,.04)", borderRadius: 11,
      border: "1px solid rgba(255,255,255,.07)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
        <Avatar name={me} size={32} />
        <div style={{ lineHeight: 1.2, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{me}</div>
          <div style={{ fontSize: 11, color: "#8FA89A" }}>{role === "Head of IT" ? "Approver" : "Requester"}</div>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: "#7E867E", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
        <Icon name="switch" size={12} /> View as
      </div>
      <div style={{ display: "flex", background: "rgba(0,0,0,.25)", borderRadius: 8, padding: 3, gap: 3 }}>
        {roles.map(r => (
          <button key={r} onClick={() => { setRole(r); push(`Switched to ${r} view`, "info"); }} style={{
            flex: 1, padding: "6px 4px", borderRadius: 6, border: "none", fontSize: 11.5, fontWeight: 600,
            background: role === r ? "var(--green-600)" : "transparent", color: role === r ? "#fff" : "#9AA29A",
            transition: "background .15s" }}>{r}</button>
        ))}
      </div>
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
        <Chip color={role === "Head of IT" ? "--st-active" : "--st-dev"} bg={role === "Head of IT" ? "--st-active-bg" : "--st-dev-bg"}>
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

Object.assign(window, { App, StoreCtx, useStore, iconBtn });
