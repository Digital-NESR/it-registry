"use client";
/* ===== Application Registry: compact data grid ===== */
import { useState, useEffect, useRef, useMemo } from "react";
import { useStore } from "./store";
import { NESR } from "@/lib/schema";
import {
  Icon, Avatar, StatusChip, ApprovalChip, CritChip, PiiCell, Dropdown,
  fmtMoney, fmtNum, fmtDate, daysUntil, VULN_C, exportCSV,
  primaryBtn, textBtn, ghostBtn,
} from "./ui";

function OwnerCell({ name }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Avatar name={name} size={22} /><span style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span></div>;
}
function DateCell({ iso, warn }) {
  const d = daysUntil(iso);
  const overdue = warn && d != null && d < 0;
  const soon = warn && d != null && d >= 0 && d <= 45;
  return <span className="num" style={{ fontSize: 12, color: overdue ? "var(--st-reject)" : soon ? "var(--st-sunset)" : "var(--text)", fontWeight: overdue || soon ? 600 : 400 }}>{fmtDate(iso)}</span>;
}

/* column definitions — render fns for special cells */
const COLDEFS = {
  name: { label: "Application", w: 230, sticky: true, render: (a) => (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span style={{ width: 30, height: 30, borderRadius: 7, background: "var(--green-100)", color: "var(--green-700)",
        display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{(a.alias || a.name || "").slice(0, 3)}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
        <div className="num" style={{ fontSize: 10.5, color: "var(--text-faint)" }}>{a.appId}</div>
      </div>
    </div>
  ) },
  status: { label: "Status", w: 150, render: (a) => <StatusChip value={a.status} /> },
  approvalStatus: { label: "Approval", w: 120, render: (a) => <ApprovalChip value={a.approvalStatus} /> },
  department: { label: "Department", w: 160 },
  country: { label: "Country", w: 120 },
  companyName: { label: "Company", w: 220 },
  businessCriticality: { label: "Criticality", w: 90, render: (a) => <CritChip value={a.businessCriticality} /> },
  businessOwner: { label: "Business Owner", w: 165, render: (a) => <OwnerCell name={a.businessOwner} /> },
  itOwner: { label: "Application Manager", w: 175, render: (a) => <OwnerCell name={a.itOwner} /> },
  sourcing: { label: "Sourcing", w: 110 },
  hostingModel: { label: "Deployment", w: 130 },
  hostingLocation: { label: "Hosted At", w: 170 },
  cloudProvider: { label: "Cloud", w: 90 },
  architectureType: { label: "Architecture", w: 120 },
  tco: { label: "TCO", w: 95, align: "right", render: (a) => <span className="num">{fmtMoney(a.tco)}</span> },
  annualLicenseCost: { label: "License $/yr", w: 105, align: "right", render: (a) => <span className="num">{fmtMoney(a.annualLicenseCost)}</span> },
  dataClassification: { label: "Data Class", w: 110 },
  containsPii: { label: "PII", w: 70, render: (a) => <PiiCell v={a.containsPii} /> },
  openVulnerabilities: { label: "Vulns", w: 90, render: (a) => <span style={{ color: VULN_C[a.openVulnerabilities], fontWeight: 600, fontSize: 12.5 }}>{a.openVulnerabilities}</span> },
  drAvailability: { label: "DR", w: 75, render: (a) => <span style={{ fontWeight: 600, color: a.drAvailability === "Yes" ? "var(--st-active)" : "var(--text-faint)" }}>{a.drAvailability || "—"}</span> },
  hasBackup: { label: "Backup", w: 85, render: (a) => <span style={{ fontWeight: 600, color: a.hasBackup === "Yes" ? "var(--st-active)" : "var(--st-reject)" }}>{a.hasBackup || "—"}</span> },
  supportTier: { label: "Support", w: 150 },
  slaAvailability: { label: "SLA", w: 80, render: (a) => <span className="num">{a.slaAvailability}</span> },
  monitoringTool: { label: "Monitoring", w: 110 },
  appVendor: { label: "Vendor", w: 150 },
  totalUserBase: { label: "Users", w: 90, align: "right", render: (a) => <span className="num">{fmtNum(a.totalUserBase)}</span> },
  strategicAlignment: { label: "Strategic Fit", w: 200 },
  integrationComplexity: { label: "Integration", w: 110 },
  ssoProvider: { label: "SSO", w: 110 },
  nextReviewDate: { label: "Next Review", w: 115, render: (a) => <DateCell iso={a.nextReviewDate} warn /> },
  contractRenewalDate: { label: "Renewal", w: 115, render: (a) => <DateCell iso={a.contractRenewalDate} warn /> },
  goLiveDate: { label: "Go-Live", w: 110, render: (a) => <DateCell iso={a.goLiveDate} /> },
};

const COL_GROUPS = [
  { key: "overview", label: "Overview", cols: ["status", "approvalStatus", "department", "businessCriticality", "tco"] },
  { key: "ownership", label: "Ownership", cols: ["businessOwner", "itOwner", "country", "companyName", "sourcing"] },
  { key: "technical", label: "Technical", cols: ["hostingModel", "hostingLocation", "cloudProvider", "architectureType", "integrationComplexity", "ssoProvider"] },
  { key: "risk", label: "Risk & Compliance", cols: ["dataClassification", "containsPii", "openVulnerabilities", "drAvailability", "hasBackup"] },
  { key: "financial", label: "Financial", cols: ["annualLicenseCost", "contractRenewalDate"] },
  { key: "vendor", label: "Vendor & Support", cols: ["appVendor", "supportTier", "slaAvailability", "monitoringTool", "nextReviewDate"] },
  { key: "value", label: "Business Value", cols: ["totalUserBase", "strategicAlignment", "goLiveDate"] },
];

export function Registry() {
  const { visibleApps: apps, goDetail, push, setView } = useStore();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({});
  const [groups, setGroups] = useState(["overview", "ownership"]);
  const [sort, setSort] = useState({ key: "name", dir: 1 });
  const [colsOpen, setColsOpen] = useState(false);
  const colsRef = useRef(null);
  useEffect(() => {
    const h = e => { if (colsRef.current && !colsRef.current.contains(e.target)) setColsOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const visCols = ["name", ...groups.flatMap(g => COL_GROUPS.find(x => x.key === g)?.cols || [])];

  const rows = useMemo(() => {
    let r = apps.filter(a =>
      (!filters.status || a.status === filters.status) &&
      (!filters.department || a.department === filters.department) &&
      (!filters.approvalStatus || a.approvalStatus === filters.approvalStatus) &&
      (!filters.businessCriticality || a.businessCriticality === filters.businessCriticality)
    );
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter(a => [a.name, a.appId, a.alias, a.department, a.businessOwner, a.itOwner, a.techStack].join(" ").toLowerCase().includes(s));
    }
    const k = sort.key;
    r = [...r].sort((a, b) => {
      let x = a[k], y = b[k];
      if (["tco", "annualLicenseCost", "activeUsers", "integrationCount", "seatCount"].includes(k)) { x = +x; y = +y; }
      if (typeof x === "string") { x = x.toLowerCase(); y = (y || "").toLowerCase(); }
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
    return r;
  }, [apps, filters, q, sort]);

  const setSortKey = (k) => setSort(s => ({ key: k, dir: s.key === k ? -s.dir : 1 }));
  const activeFilters = Object.entries(filters).filter(([, v]) => v);
  const deptOptions = useMemo(() => [...new Set(apps.map(a => a.department).filter(Boolean))].sort(), [apps]);

  return (
    <div style={{ padding: "20px 26px 10px", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 13, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 0 280px" }}>
          <Icon name="search" size={16} style={{ position: "absolute", left: 11, top: 9, color: "var(--text-faint)" }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search apps, owners, stack…" className="focusable" style={{
            width: "100%", padding: "8px 11px 8px 34px", borderRadius: 8, border: "1px solid var(--line-strong)",
            fontSize: 13, fontFamily: "inherit", background: "var(--surface)" }} />
        </div>
        <Dropdown label="Status" value={filters.status} options={NESR.refs.status} onChange={v => setFilters(f => ({ ...f, status: v }))} />
        <Dropdown label="Department" value={filters.department} options={deptOptions} onChange={v => setFilters(f => ({ ...f, department: v }))} />
        <Dropdown label="Criticality" value={filters.businessCriticality} options={NESR.refs.businessCriticality} onChange={v => setFilters(f => ({ ...f, businessCriticality: v }))} />
        <Dropdown label="Approval" value={filters.approvalStatus} options={["Approved", "Pending", "Draft", "Rejected"]} onChange={v => setFilters(f => ({ ...f, approvalStatus: v }))} />
        {activeFilters.length > 0 && <button onClick={() => setFilters({})} style={textBtn}><Icon name="x" size={13} /> Clear</button>}
        <div style={{ flex: 1 }} />
        {/* columns */}
        <div ref={colsRef} style={{ position: "relative" }}>
          <button onClick={() => setColsOpen(o => !o)} style={ghostBtn}><Icon name="layers" size={15} /> Columns <Icon name="chevDown" size={13} /></button>
          {colsOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 5px)", right: 0, zIndex: 30, width: 210, background: "var(--surface)",
              border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 7, animation: "popIn .16s ease both" }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-faint)", letterSpacing: ".06em", textTransform: "uppercase", padding: "4px 8px 7px" }}>Column groups</div>
              {COL_GROUPS.map(g => {
                const on = groups.includes(g.key);
                return (
                  <button key={g.key} onClick={() => setGroups(gs => on ? gs.filter(x => x !== g.key) : [...gs, g.key])} style={{
                    display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "7px 8px", borderRadius: 7, border: "none",
                    background: "transparent", fontSize: 12.5, fontWeight: 500, textAlign: "left", color: "var(--text)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ width: 16, height: 16, borderRadius: 5, border: "1.5px solid " + (on ? "var(--green-600)" : "var(--line-strong)"),
                      background: on ? "var(--green-600)" : "transparent", display: "grid", placeItems: "center", color: "#fff", flexShrink: 0 }}>
                      {on && <Icon name="check" size={11} strokeWidth={3} />}
                    </span>
                    {g.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={() => { exportCSV(rows, `NESR-registry-${NESR.today}.csv`); push(`Exported ${rows.length} applications to CSV`); }} style={primaryBtn}>
          <Icon name="export" size={15} /> Export CSV
        </button>
        <button onClick={() => setView("add")} style={{ ...primaryBtn, background: "var(--ink)" }}><Icon name="plus" size={15} /> New</button>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 8 }} className="num">
        Showing {rows.length} of {apps.length} applications
      </div>

      {/* table */}
      <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", minHeight: 0 }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content", minWidth: "100%", fontSize: 12.5 }}>
          <thead>
            <tr>
              {visCols.map((c, ci) => {
                const def = COLDEFS[c];
                return (
                  <th key={c} onClick={() => setSortKey(c)} style={{
                    position: "sticky", top: 0, zIndex: def.sticky ? 6 : 4, left: def.sticky ? 0 : "auto",
                    background: "var(--surface-2)", borderBottom: "1px solid var(--line-strong)",
                    borderRight: ci === 0 ? "1px solid var(--line)" : "none",
                    padding: "10px 14px", textAlign: def.align || "left", whiteSpace: "nowrap", cursor: "pointer",
                    fontWeight: 600, fontSize: 11.5, color: "var(--text-soft)", letterSpacing: ".01em",
                    minWidth: def.w, boxShadow: def.sticky ? "2px 0 0 var(--line)" : "none", userSelect: "none" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: def.align === "right" ? "flex-end" : "flex-start" }}>
                      {def.label}
                      {sort.key === c && <Icon name={sort.dir === 1 ? "arrowUp" : "arrowDown"} size={12} style={{ color: "var(--green-600)" }} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((a, ri) => (
              <tr key={a.id} onClick={() => goDetail(a.id)} style={{ cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.querySelectorAll("td").forEach(td => td.style.background = "#EAF3EE"); }}
                onMouseLeave={e => { e.currentTarget.querySelectorAll("td").forEach(td => td.style.background = ri % 2 ? "#fff" : "var(--surface-2)"); }}>
                {visCols.map((c, ci) => {
                  const def = COLDEFS[c];
                  return (
                    <td key={c} style={{
                      position: def.sticky ? "sticky" : "static", left: def.sticky ? 0 : "auto", zIndex: def.sticky ? 2 : 1,
                      background: ri % 2 ? "#fff" : "var(--surface-2)", borderBottom: "1px solid var(--line)",
                      borderRight: ci === 0 ? "1px solid var(--line)" : "none",
                      padding: "9px 14px", textAlign: def.align || "left", whiteSpace: "nowrap", minWidth: def.w,
                      boxShadow: def.sticky ? "2px 0 0 var(--line)" : "none" }}>
                      {def.render ? def.render(a) : (a[c] || "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={visCols.length} style={{ padding: "60px 0", textAlign: "center", color: "var(--text-faint)" }}>
                No applications match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
