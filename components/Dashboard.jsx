"use client";
/* ===== Dashboard: portfolio analytics, slice & dice, export ===== */
import { useState, useRef, useMemo } from "react";
import { useStore } from "./store";
import { NESR } from "@/lib/schema";
import {
  Icon, Dropdown, Panel, exportCSV, fmtMoney, fmtNum, fmtDate, daysUntil,
  STATUS_C, CRIT_C, VULN_C, critTier, primaryBtn, textBtn,
} from "./ui";

const PIE_COLORS = ["#2A7E4F", "#2563A8", "#B7791F", "#C05621", "#6B6D6B", "#8B5CF6", "#0E7490", "#BE185D"];

function countBy(arr, fn) {
  const m = new Map();
  arr.forEach(x => { const k = fn(x); m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
function sumBy(arr, keyFn, valFn) {
  const m = new Map();
  arr.forEach(x => { const k = keyFn(x); m.set(k, (m.get(k) || 0) + valFn(x)); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/* ---------- Donut ---------- */
function Donut({ data, size = 168, thickness = 26, colorMap, onSlice, activeKey }) {
  const total = data.reduce((s, d) => s + d[1], 0) || 1;
  const r = (size - thickness) / 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
  let off = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
        {data.map((d, i) => {
          const frac = d[1] / total; const len = frac * C;
          const col = colorMap ? colorMap(d[0]) : PIE_COLORS[i % PIE_COLORS.length];
          const dim = activeKey && activeKey !== d[0];
          const seg = (
            <circle key={d[0]} cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={thickness}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}
              style={{ cursor: onSlice ? "pointer" : "default", opacity: dim ? 0.28 : 1, transition: "opacity .2s" }}
              onClick={() => onSlice && onSlice(d[0])}>
              <animate attributeName="stroke-dashoffset" from={-off + len} to={-off} dur="0.01s" fill="freeze" />
            </circle>
          );
          off += len; return seg;
        })}
        <circle cx={cx} cy={cy} r={r - thickness / 2 - 1} fill="none" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 130 }}>
        {data.map((d, i) => {
          const col = colorMap ? colorMap(d[0]) : PIE_COLORS[i % PIE_COLORS.length];
          return (
            <div key={d[0]} onClick={() => onSlice && onSlice(d[0])} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: onSlice ? "pointer" : "default" }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: col, flexShrink: 0 }} />
              <span style={{ color: "var(--text-soft)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d[0]}</span>
              <span className="num" style={{ fontWeight: 600 }}>{d[1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- horizontal bar list ---------- */
function BarList({ data, colorFn, fmt, onBar, activeKey, max }) {
  const m = max || Math.max(...data.map(d => d[1]), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {data.map((d, i) => {
        const col = colorFn ? colorFn(d[0], i) : "var(--green-600)";
        const dim = activeKey && activeKey !== d[0];
        return (
          <div key={d[0]} onClick={() => onBar && onBar(d[0])} style={{ cursor: onBar ? "pointer" : "default", opacity: dim ? 0.4 : 1, transition: "opacity .2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
              <span style={{ color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "75%" }}>{d[0]}</span>
              <span className="num" style={{ fontWeight: 600, color: "var(--text-soft)" }}>{fmt ? fmt(d[1]) : d[1]}</span>
            </div>
            <div style={{ height: 8, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: (d[1] / m * 100) + "%", height: "100%", background: col, borderRadius: 99,
                transformOrigin: "left", transition: "width .4s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- segmented stacked bar ---------- */
function SegBar({ data, colorMap, onSeg, activeKey }) {
  const total = data.reduce((s, d) => s + d[1], 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height: 34, borderRadius: 9, overflow: "hidden", boxShadow: "inset 0 0 0 1px var(--line)" }}>
        {data.map((d, i) => {
          const col = colorMap(d[0]); const dim = activeKey && activeKey !== d[0];
          return (
            <div key={d[0]} onClick={() => onSeg && onSeg(d[0])} title={`${d[0]}: ${d[1]}`} style={{
              width: (d[1] / total * 100) + "%", background: col, opacity: dim ? 0.3 : 1, cursor: onSeg ? "pointer" : "default",
              display: "grid", placeItems: "center", color: "#fff", fontSize: 12, fontWeight: 700, transition: "opacity .2s" }}>
              {d[1] / total > 0.07 ? d[1] : ""}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 12 }}>
        {data.map(d => (
          <div key={d[0]} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: colorMap(d[0]) }} />
            <span style={{ color: "var(--text-soft)" }}>{d[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { apps, goDetail, push, setView } = useStore();
  const [filters, setFilters] = useState({}); // {department, status, businessCriticality, hostingModel}

  const toggle = (key, val) => setFilters(f => ({ ...f, [key]: f[key] === val ? undefined : val }));
  const activeFilters = Object.entries(filters).filter(([, v]) => v);

  const filtered = useMemo(() => apps.filter(a =>
    a.approvalStatus !== "Draft" &&
    (!filters.department || a.department === filters.department) &&
    (!filters.status || a.status === filters.status) &&
    (!filters.businessCriticality || a.businessCriticality === filters.businessCriticality) &&
    (!filters.hostingModel || a.hostingModel === filters.hostingModel)
  ), [apps, filters]);

  const tco = filtered.reduce((s, a) => s + (+a.tco || 0), 0);
  const license = filtered.reduce((s, a) => s + (+a.annualLicenseCost || 0), 0);
  const activeN = filtered.filter(a => a.status === "Active").length;
  const pendingN = apps.filter(a => a.approvalStatus === "Pending").length;
  const highVuln = filtered.filter(a => ["High", "Critical"].includes(a.openVulnerabilities)).length;
  const renewals = filtered.filter(a => { const d = daysUntil(a.contractRenewalDate); return d != null && d >= 0 && d <= 120; })
    .sort((a, b) => daysUntil(a.contractRenewalDate) - daysUntil(b.contractRenewalDate));

  const byStatus = countBy(filtered, a => a.status);
  const byDept = countBy(filtered, a => a.department).slice(0, 8);
  const spendByDept = sumBy(filtered, a => a.department, a => +a.tco || 0).slice(0, 7);
  const byHosting = countBy(filtered, a => a.hostingModel);
  const byCrit = ["Tier 1 – Mission Critical", "Tier 2 – Business Critical", "Tier 3 – Standard", "Tier 4 – Low"]
    .map(t => [t.replace(/ –.*/, ""), filtered.filter(a => a.businessCriticality === t).length]).filter(d => d[1] > 0);
  const piiYes = filtered.filter(a => a.containsPii === "Yes").length;
  const vulnDist = ["None", "Low", "Medium", "High", "Critical"].map(v => [v, filtered.filter(a => a.openVulnerabilities === v).length]);

  const statusColor = (s) => `var(${(STATUS_C[s] || STATUS_C.Decommissioned)[0]})`;
  const critColorByLabel = (l) => CRIT_C[+l.replace("Tier ", "")] || "#6B6D6B";

  return (
    <div style={{ padding: "22px 26px 40px" }}>
      {/* filter / export bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-soft)", fontWeight: 600 }}>
          <Icon name="filter" size={15} /> Slice by
        </div>
        <Dropdown label="Department" value={filters.department} options={NESR.departments}
          onChange={v => setFilters(f => ({ ...f, department: v }))} />
        <Dropdown label="Status" value={filters.status} options={NESR.refs.status}
          onChange={v => setFilters(f => ({ ...f, status: v }))} />
        <Dropdown label="Criticality" value={filters.businessCriticality} options={NESR.refs.businessCriticality}
          onChange={v => setFilters(f => ({ ...f, businessCriticality: v }))} />
        {activeFilters.length > 0 && (
          <button onClick={() => setFilters({})} style={textBtn}>
            <Icon name="x" size={13} /> Clear ({activeFilters.length})
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: "var(--text-faint)" }} className="num">{filtered.length} apps in view</span>
        <button onClick={() => { exportCSV(filtered, `NESR-registry-${NESR.today}.csv`); push(`Exported ${filtered.length} applications to CSV`); }}
          style={primaryBtn}>
          <Icon name="export" size={15} /> Export CSV
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {activeFilters.map(([k, v]) => (
            <button key={k} onClick={() => setFilters(f => ({ ...f, [k]: undefined }))} style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px 4px 11px", borderRadius: 99,
              background: "var(--green-100)", color: "var(--green-700)", border: "none", fontSize: 12, fontWeight: 600 }}>
              {v} <Icon name="x" size={12} strokeWidth={2.4} />
            </button>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 16 }}>
        <Kpi label="Applications" value={filtered.length} icon="grid" tone="--green-600" />
        <Kpi label="Active" value={activeN} icon="check" tone="--st-active" sub={`${Math.round(activeN / (filtered.length || 1) * 100)}% of estate`} />
        <Kpi label="Pending Approval" value={pendingN} icon="clock" tone="--st-review" onClick={() => setView("approvals")} link />
        <Kpi label="Annual TCO" value={fmtMoney(tco)} icon="coin" tone="--st-dev" sub={`License ${fmtMoney(license)}`} mono />
        <Kpi label="High / Critical Vulns" value={highVuln} icon="alert" tone="--st-reject" sub="open security findings" />
      </div>

      {/* charts grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 }}>
        <Panel title="Lifecycle status" sub="Click a slice to filter the dashboard" span={4}>
          <Donut data={byStatus} colorMap={statusColor} onSlice={v => toggle("status", v)} activeKey={filters.status} />
        </Panel>

        <Panel title="Applications by department" sub="Top 8 by count" span={5}>
          <BarList data={byDept} colorFn={(k, i) => PIE_COLORS[i % PIE_COLORS.length]}
            onBar={v => toggle("department", v)} activeKey={filters.department} />
        </Panel>

        <Panel title="Hosting footprint" span={3}>
          <Donut data={byHosting} size={150} thickness={24} onSlice={v => toggle("hostingModel", v)} activeKey={filters.hostingModel} />
        </Panel>

        <Panel title="Annual spend by department" sub="Total cost of ownership" span={6}>
          <BarList data={spendByDept} fmt={fmtMoney} colorFn={() => "var(--green-600)"} max={Math.max(...spendByDept.map(d => d[1]), 1)} />
        </Panel>

        <Panel title="Business criticality" sub="Share of portfolio by tier" span={6}>
          <SegBar data={byCrit} colorMap={critColorByLabel} onSeg={l => {
            const full = NESR.refs.businessCriticality.find(c => c.startsWith(l)); toggle("businessCriticality", full);
          }} activeKey={filters.businessCriticality && filters.businessCriticality.replace(/ –.*/, "")} />
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <MiniStat label="Customer-facing apps" value={filtered.filter(a => a.customerFacing === "Yes").length} />
            <MiniStat label="Tier-1 mission critical" value={filtered.filter(a => critTier(a.businessCriticality) === 1).length} tone="--st-reject" />
          </div>
        </Panel>

        <Panel title="Security & compliance" sub="Open vulnerabilities across the estate" span={7}>
          <div style={{ display: "flex", gap: 7, alignItems: "flex-end", height: 130, marginBottom: 8 }}>
            {vulnDist.map((v, i) => {
              const m = Math.max(...vulnDist.map(x => x[1]), 1);
              return (
                <div key={v[0]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <span className="num" style={{ fontSize: 12, fontWeight: 700, color: VULN_C[v[0]] }}>{v[1]}</span>
                  <div style={{ width: "100%", maxWidth: 54, height: (v[1] / m * 88) + "%", minHeight: v[1] ? 4 : 0,
                    background: VULN_C[v[0]], borderRadius: "6px 6px 0 0", transformOrigin: "bottom",
                    animation: `growBar .6s cubic-bezier(.3,.8,.3,1) ${i * 0.05}s both` }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            {vulnDist.map(v => <div key={v[0]} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--text-faint)", fontWeight: 500 }}>{v[0]}</div>)}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
            <MiniStat label="Contains PII" value={piiYes} sub={`${Math.round(piiYes / (filtered.length || 1) * 100)}% of apps`} />
            <MiniStat label="Under regulatory scope" value={filtered.filter(a => a.regulatoryScope !== "None").length} />
          </div>
        </Panel>

        <Panel title="Upcoming contract renewals" sub="Next 120 days" span={5}
          action={<button onClick={() => setView("registry")} style={textBtn}>View all <Icon name="chevRight" size={13} /></button>}>
          {renewals.length === 0
            ? <div style={{ padding: "26px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 12.5 }}>No renewals due in this window.</div>
            : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {renewals.slice(0, 6).map((a, i) => {
                  const d = daysUntil(a.contractRenewalDate);
                  const urgent = d <= 30;
                  return (
                    <div key={a.id} onClick={() => goDetail(a.id)} style={{ display: "flex", alignItems: "center", gap: 11,
                      padding: "9px 4px", borderTop: i ? "1px solid var(--line)" : "none", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: urgent ? "var(--st-sunset)" : "var(--green-400)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>{a.department} · {fmtMoney(a.annualLicenseCost)}/yr</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div className="num" style={{ fontSize: 12.5, fontWeight: 700, color: urgent ? "var(--st-sunset)" : "var(--text)" }}>{d}d</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{fmtDate(a.contractRenewalDate)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </Panel>
      </div>
    </div>
  );
}

/* ---------- KPI card ---------- */
function Kpi({ label, value, icon, tone, sub, mono, onClick, link }) {
  return (
    <div onClick={onClick} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14,
      padding: "15px 16px", boxShadow: "var(--shadow-sm)", cursor: onClick ? "pointer" : "default", position: "relative", overflow: "hidden" }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11.5, color: "var(--text-soft)", fontWeight: 600, letterSpacing: ".01em" }}>{label}</span>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: `color-mix(in srgb, var(${tone}) 12%, white)`, color: `var(${tone})`, display: "grid", placeItems: "center" }}>
          <Icon name={icon} size={15} strokeWidth={2} />
        </span>
      </div>
      <div className={mono ? "num" : ""} style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 5, minHeight: 14 }}>
        {link ? <span style={{ color: `var(${tone})`, fontWeight: 600 }}>Review now →</span> : sub}
      </div>
    </div>
  );
}
function MiniStat({ label, value, sub, tone }) {
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px", flex: 1 }}>
      <div className="num" style={{ fontSize: 21, fontWeight: 700, color: tone ? `var(${tone})` : "var(--text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 4, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{sub}</div>}
    </div>
  );
}
