/* ===== Shared UI primitives, icons & helpers ===== */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ---------- formatting helpers ---------- */
function fmtMoney(n) {
  if (n == null || n === "" || isNaN(n)) return "—";
  n = +n;
  if (n === 0) return "$0";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, "") + "M";
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K";
  return "$" + n;
}
function fmtMoneyFull(n) { if (n == null || n === "" || isNaN(n)) return "—"; return "$" + (+n).toLocaleString("en-US"); }
function fmtNum(n) { if (n == null || n === "") return "—"; return (+n).toLocaleString("en-US"); }
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso); if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function daysUntil(iso) { if (!iso) return null; return Math.round((new Date(iso) - new Date("2026-06-02")) / 86400000); }
function initials(name) { return (name || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase(); }
const AV_COLORS = ["#2A7E4F", "#2563A8", "#B7791F", "#8B5CF6", "#C05621", "#0E7490", "#BE185D", "#475569"];
function avatarColor(name) { let h = 0; for (const c of (name || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV_COLORS[h % AV_COLORS.length]; }

/* ---------- status colour maps ---------- */
const STATUS_C = {
  "Active": ["--st-active", "--st-active-bg"], "Under Development": ["--st-dev", "--st-dev-bg"],
  "Under Review": ["--st-review", "--st-review-bg"], "Sunset": ["--st-sunset", "--st-sunset-bg"],
  "Decommissioned": ["--st-decom", "--st-decom-bg"],
};
const APPROVAL_C = {
  "Approved": ["--st-active", "--st-active-bg"], "Pending": ["--st-review", "--st-review-bg"],
  "Draft": ["--st-draft", "--st-draft-bg"], "Rejected": ["--st-reject", "--st-reject-bg"],
};
const VULN_C = { "None": "#2A7E4F", "Low": "#6AAF8E", "Medium": "#B7791F", "High": "#C05621", "Critical": "#B42318" };
function critTier(c) { return c && c.startsWith("Tier 1") ? 1 : c && c.startsWith("Tier 2") ? 2 : c && c.startsWith("Tier 3") ? 3 : 4; }
const CRIT_C = { 1: "#B42318", 2: "#C05621", 3: "#B7791F", 4: "#6B6D6B" };

/* ---------- icons (lucide-style stroke paths) ---------- */
const ICONS = {
  dashboard: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35",
  export: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3Z",
  chevDown: "M6 9l6 6 6-6", chevRight: "M9 18l6-6-6-6", chevLeft: "M15 18l-6-6 6-6",
  arrowUp: "M12 19V5M5 12l7-7 7 7", arrowDown: "M12 5v14M19 12l-7 7-7-7",
  check: "M20 6 9 17l-5-5", x: "M18 6 6 18M6 6l12 12",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  coin: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v12M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5 1.3 2.5 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5",
  chip: "M9 3v2m6-2v2M9 19v2m6-2v2M3 9H1m2 6H1m22-6h-2m2 6h-2M6 6h12v12H6zM10 10h4v4h-4z",
  cycle: "M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5",
  star: "M12 2l2.9 6.3 6.6.6-5 4.4 1.5 6.5L12 17l-5.9 3.3L7.6 13.8l-5-4.4 6.6-.6L12 2Z",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.2L3 18l3 3 6.5-6.3a4 4 0 0 0 5.2-5.4l-2.7 2.7-2.7-.7-.7-2.7 2.8-2.6Z",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1.5-1.5",
  id: "M3 5h18v14H3zM7 9h4M7 13h4M7 17h2M15 8h3v4h-3z",
  user: "M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  switch: "M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16",
  building: "M3 21h18M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M17 9h2a2 2 0 0 1 2 2v10",
  alert: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z",
  trend: "M22 7l-8.5 8.5-5-5L2 17M16 7h6v6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  cloud: "M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 1 0 6 16.6",
  layers: "M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5",
};
function Icon({ name, size = 18, className = "", strokeWidth = 1.7, style }) {
  const fillIcons = []; // all stroke
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true">
      <path d={ICONS[name] || ICONS.grid} />
    </svg>
  );
}

/* ---------- chips & badges ---------- */
function Chip({ color, bg, children, dot, style }) {
  return (
    <span className="chip" style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 9px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, color: `var(${color})`, background: `var(${bg})`,
      lineHeight: 1.6, whiteSpace: "nowrap", ...style }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 99, background: `var(${color})` }} />}
      {children}
    </span>
  );
}
function StatusChip({ value, style }) {
  const c = STATUS_C[value] || STATUS_C["Decommissioned"];
  return <Chip color={c[0]} bg={c[1]} dot style={style}>{value}</Chip>;
}
function ApprovalChip({ value, style }) {
  const c = APPROVAL_C[value] || APPROVAL_C["Draft"];
  return <Chip color={c[0]} bg={c[1]} dot style={style}>{value}</Chip>;
}
function CritChip({ value, style }) {
  const t = critTier(value); const col = CRIT_C[t];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: col, whiteSpace: "nowrap", ...style }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: col }} />T{t}
    </span>
  );
}
function Avatar({ name, size = 26, ring }) {
  return (
    <span title={name} style={{
      width: size, height: size, borderRadius: 99, flexShrink: 0, display: "inline-flex",
      alignItems: "center", justifyContent: "center", background: avatarColor(name), color: "#fff",
      fontSize: size * 0.38, fontWeight: 600, letterSpacing: ".02em",
      boxShadow: ring ? "0 0 0 2px #fff, 0 0 0 3px " + avatarColor(name) : "none" }}>
      {initials(name)}
    </span>
  );
}

/* ---------- generic Modal ---------- */
function Modal({ open, onClose, children, width = 560, label }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} role="dialog" aria-label={label} style={{
      position: "fixed", inset: 0, background: "rgba(31,31,29,.42)", zIndex: 80,
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 20px",
      animation: "fadeIn .18s ease", backdropFilter: "blur(2px)" }}>
      <div onClick={e => e.stopPropagation()} style={{
        width, maxWidth: "100%", maxHeight: "88vh", overflow: "auto", background: "var(--surface)",
        borderRadius: 14, boxShadow: "var(--shadow-lg)", animation: "popIn .22s cubic-bezier(.2,.7,.3,1) both" }}>
        {children}
      </div>
    </div>
  );
}

/* expose to other babel scripts */
Object.assign(window, {
  fmtMoney, fmtMoneyFull, fmtNum, fmtDate, daysUntil, initials, avatarColor,
  STATUS_C, APPROVAL_C, VULN_C, CRIT_C, critTier,
  Icon, Chip, StatusChip, ApprovalChip, CritChip, Avatar, Modal,
});
