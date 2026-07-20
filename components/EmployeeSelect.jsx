"use client";
/* Async searchable picker over the NESR Azure AD directory (/api/employees).
   `field` decides what gets stored: "name" (default) or "email". */
import { useState, useEffect, useRef } from "react";
import { Icon } from "./ui";

const box = (error) => ({
  width: "100%", padding: "9px 11px", borderRadius: 8, fontFamily: "inherit", fontSize: 13,
  border: "1px solid " + (error ? "var(--st-reject)" : "var(--line-strong)"), background: "var(--surface)", color: "var(--text)",
});

export function EmployeeSelect({ value, onChange, placeholder, error, field = "name" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => {
    if (!open) return;
    let active = true; setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/employees?q=${encodeURIComponent(q)}`).then((x) => (x.ok ? x.json() : []));
        if (active) setResults(Array.isArray(r) ? r : []);
      } catch { if (active) setResults([]); }
      finally { if (active) setLoading(false); }
    }, 200);
    return () => { active = false; clearTimeout(t); };
  }, [q, open]);

  const pick = (r) => { onChange(r[field] ?? r.name); setOpen(false); setQ(""); };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="focusable"
        style={{ ...box(error), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          textAlign: "left", cursor: "pointer", color: value ? "var(--text)" : "var(--text-faint)" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || placeholder || "Search employee…"}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {value && <span onClick={(e) => { e.stopPropagation(); onChange(""); }} style={{ display: "grid", placeItems: "center", color: "var(--text-faint)" }}><Icon name="x" size={13} /></span>}
          <Icon name="chevDown" size={14} style={{ color: "var(--text-faint)" }} />
        </span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, zIndex: 40, maxHeight: 280, overflow: "auto",
          background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 6, animation: "popIn .16s ease both" }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name or email…"
            style={{ ...box(false), marginBottom: 6 }} onClick={(e) => e.stopPropagation()} />
          {loading && <div style={{ padding: 8, fontSize: 12, color: "var(--text-faint)" }}>Searching…</div>}
          {!loading && results.length === 0 && <div style={{ padding: 8, fontSize: 12, color: "var(--text-faint)" }}>No matches.</div>}
          {!loading && results.map((r) => (
            <button type="button" key={r.email || r.name} onClick={() => pick(r)}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 8px", borderRadius: 7, border: "none",
                background: r[field] === value ? "var(--green-100)" : "transparent" }}
              onMouseEnter={(e) => { if (r[field] !== value) e.currentTarget.style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { if (r[field] !== value) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{r.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{[r.jobTitle, r.department].filter(Boolean).join(" · ") || r.email}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
