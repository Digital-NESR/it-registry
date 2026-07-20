"use client";
/* ===== Add / Edit Application: multi-step submission form ===== */
import { Fragment, useState, useEffect, useRef, useMemo } from "react";
import { useStore } from "./store";
import { NESR, headOfIT, fieldByKey } from "@/lib/schema";
import { Icon, primaryBtn, ghostBtn, textBtn } from "./ui";
import { EmployeeSelect } from "./EmployeeSelect";

const GLOBAL = "Global";
// Cost-centre mapping is fetched once per session and cached.
let _ccCache = null;
async function loadCostCenters() {
  if (_ccCache) return _ccCache;
  try { const r = await fetch("/api/cost-centers", { cache: "no-store" }); _ccCache = r.ok ? await r.json() : []; }
  catch { _ccCache = []; }
  return _ccCache;
}

const REQUIRED = ["name", "businessOwner", "itOwner", "department", "sourcing", "hostingModel", "status", "businessCriticality", "dataClassification"];

const STEPS = [
  { label: "Identity & Ownership", icon: "id", domains: ["identity"], lead: true },
  { label: "Technical & Hosting", icon: "chip", domains: ["technical", "onprem"] },
  { label: "Risk & Resilience", icon: "shield", domains: ["lifecycle", "risk", "resilience"] },
  { label: "Financial & Vendor", icon: "coin", domains: ["financial", "vendor"] },
  { label: "Operations & Value", icon: "wrench", domains: ["support", "value", "dependencies", "documents"] },
  { label: "Review & Submit", icon: "check", domains: [] },
];

function emptyApp() {
  const o = { name: "" };
  NESR.fieldDefs.forEach((f) => { o[f.key] = f.multi || f.apps ? [] : f.obj ? {} : ""; });
  o.annualLicenseCost = 0;
  o.annualMaintCost = 0;
  o.tco = 0;
  return o;
}
const computeTco = (d) => (Number(d.annualLicenseCost) || 0) + (Number(d.annualMaintCost) || 0);

const fieldVisible = (f, data) => !f.hidden && (!f.showIf || (f.showIf.in || []).includes(data[f.showIf.key]));
const domainVisible = (dom, data) => !dom.showIf || (dom.showIf.in || []).includes(data[dom.showIf.key]);

const inputStyle = (error) => ({
  width: "100%", padding: "9px 11px", borderRadius: 8, fontFamily: "inherit", fontSize: 13,
  border: "1px solid " + (error ? "var(--st-reject)" : "var(--line-strong)"), background: "var(--surface)", color: "var(--text)",
});

/* ---------- multiselect (used for certifications & app links) ---------- */
function MultiSelect({ value = [], options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen((o) => !o)} className="focusable" style={{ ...inputStyle(false), minHeight: 38,
        display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", cursor: "pointer" }}>
        {value.length === 0 && <span style={{ color: "var(--text-faint)" }}>{placeholder || "Select…"}</span>}
        {value.map((v) => (
          <span key={v} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 6px 2px 9px",
            borderRadius: 7, background: "var(--green-100)", color: "var(--green-700)", fontSize: 12, fontWeight: 600 }}>
            {v}
            <button type="button" onClick={(e) => { e.stopPropagation(); toggle(v); }} style={{ border: "none", background: "transparent", color: "var(--green-700)", cursor: "pointer", padding: 0, display: "grid", placeItems: "center" }}>
              <Icon name="x" size={12} strokeWidth={2.6} />
            </button>
          </span>
        ))}
        <span style={{ marginLeft: "auto" }}><Icon name="chevDown" size={14} style={{ color: "var(--text-faint)" }} /></span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, zIndex: 30, maxHeight: 240, overflow: "auto",
          background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 6, animation: "popIn .16s ease both" }}>
          {options.length > 8 && (
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
              style={{ ...inputStyle(false), marginBottom: 6 }} onClick={(e) => e.stopPropagation()} />
          )}
          {filtered.length === 0 && <div style={{ padding: 8, fontSize: 12, color: "var(--text-faint)" }}>No matches.</div>}
          {filtered.map((o) => {
            const on = value.includes(o);
            return (
              <button type="button" key={o} onClick={() => toggle(o)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%",
                padding: "7px 8px", borderRadius: 7, border: "none", background: "transparent", textAlign: "left", fontSize: 12.5, color: "var(--text)" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <span style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: "1.5px solid " + (on ? "var(--green-600)" : "var(--line-strong)"),
                  background: on ? "var(--green-600)" : "transparent", display: "grid", placeItems: "center", color: "#fff" }}>
                  {on && <Icon name="check" size={11} strokeWidth={3} />}
                </span>
                {o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- searchable single-select ---------- */
function SearchSelect({ value, options, onChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  const shown = filtered.slice(0, 200);
  const pick = (o) => { onChange(o); setOpen(false); setQ(""); };
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen((o) => !o)}
        style={{ ...inputStyle(false), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer", background: disabled ? "var(--surface-2)" : "var(--surface)", color: value ? "var(--text)" : "var(--text-faint)" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || placeholder || "Select…"}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {value && !disabled && <span onClick={(e) => { e.stopPropagation(); onChange(""); }} style={{ display: "grid", placeItems: "center", color: "var(--text-faint)" }}><Icon name="x" size={13} /></span>}
          <Icon name="chevDown" size={14} style={{ color: "var(--text-faint)" }} />
        </span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, zIndex: 40, maxHeight: 260, overflow: "auto",
          background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 6, animation: "popIn .16s ease both" }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ ...inputStyle(false), marginBottom: 6 }} onClick={(e) => e.stopPropagation()} />
          {shown.length === 0 && <div style={{ padding: 8, fontSize: 12, color: "var(--text-faint)" }}>No matches.</div>}
          {shown.map((o) => (
            <button type="button" key={o} onClick={() => pick(o)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 8px",
              borderRadius: 7, border: "none", background: o === value ? "var(--green-100)" : "transparent", textAlign: "left", fontSize: 12.5,
              fontWeight: o === GLOBAL ? 700 : o === value ? 600 : 500, color: o === GLOBAL ? "var(--green-700)" : "var(--text)" }}
              onMouseEnter={(e) => { if (o !== value) e.currentTarget.style.background = "var(--surface-2)"; }} onMouseLeave={(e) => { if (o !== value) e.currentTarget.style.background = "transparent"; }}>
              {o}
            </button>
          ))}
          {filtered.length > shown.length && <div style={{ padding: "6px 8px", fontSize: 11, color: "var(--text-faint)" }}>+{filtered.length - shown.length} more — refine your search</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- cascading cost-centre picker (Country → Company → Dept/Cost Centre) ---------- */
const uniqSorted = (arr) => [...new Set(arr.filter(Boolean))].sort();

function CostCenterPicker({ value, patch, mapping, touched, errors }) {
  const { country, companyName, department, costCentre } = value;
  const data = useMemo(() => {
    const countries = uniqSorted(mapping.map((r) => r.country));
    const allCompanies = uniqSorted(mapping.map((r) => r.company));
    const companiesByCountry = {};
    mapping.forEach((r) => { (companiesByCountry[r.country] ??= new Set()).add(r.company); });
    return { countries, allCompanies, companiesByCountry };
  }, [mapping]);

  const globalActive = country === GLOBAL || companyName === GLOBAL;

  // candidate rows for department / cost-centre
  const rows = useMemo(() => {
    if (globalActive) return mapping;
    if (companyName) return mapping.filter((r) => r.company === companyName && (country && country !== GLOBAL ? r.country === country : true));
    return null; // company required first
  }, [mapping, country, companyName, globalActive]);

  const companyOptions = !country ? null
    : country === GLOBAL ? [GLOBAL, ...data.allCompanies]
    : [GLOBAL, ...uniqSorted([...(data.companiesByCountry[country] || [])])];

  const deptRows = rows && department && department !== GLOBAL ? rows.filter((r) => r.department === department) : rows;
  const ccRows = rows && costCentre && costCentre !== GLOBAL ? rows.filter((r) => r.costCenter === costCentre) : rows;
  const departmentOptions = rows ? [GLOBAL, ...uniqSorted(rows.map((r) => r.department))] : null;
  const costCenterOptions = rows ? [GLOBAL, ...uniqSorted((deptRows || rows).map((r) => r.costCenter))] : null;

  const onCountry = (v) => patch({ country: v, companyName: "", department: "", costCentre: "" });
  const onCompany = (v) => patch({ companyName: v, department: "", costCentre: "" });
  const onDepartment = (v) => {
    if (v === GLOBAL || v === "") return patch({ department: v });
    const matches = (rows || []).filter((r) => r.department === v);
    // 1-to-1 within a company: auto-fill the cost centre if unambiguous.
    patch({ department: v, costCentre: matches.length === 1 ? matches[0].costCenter : (matches.some((m) => m.costCenter === costCentre) ? costCentre : "") });
  };
  const onCostCentre = (v) => {
    if (v === GLOBAL || v === "") return patch({ costCentre: v });
    const row = (rows || mapping).find((r) => r.costCenter === v);
    patch({ costCentre: v, department: row ? row.department : department });
  };

  const Cell = ({ k, options, onChange, placeholder, disabled }) => {
    const f = fieldByKey[k];
    const req = REQUIRED.includes(k);
    const err = touched && errors[k];
    return (
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "var(--text-soft)", marginBottom: 5 }}>
          {f.label}{req && <span style={{ color: "var(--st-reject)" }}>*</span>}
        </label>
        <SearchSelect value={value[k]} options={options || []} onChange={onChange} placeholder={placeholder} disabled={disabled} />
        {f.hint && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4, lineHeight: 1.4 }}>{f.hint}</div>}
        {err && <div style={{ fontSize: 11, color: "var(--st-reject)", marginTop: 4, fontWeight: 600 }}>{err}</div>}
      </div>
    );
  };

  return (
    <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px",
      padding: 14, borderRadius: 11, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
      <Cell k="country" options={[GLOBAL, ...data.countries]} onChange={onCountry} placeholder="Select country…" />
      <Cell k="companyName" options={companyOptions} onChange={onCompany} placeholder={country ? "Select company…" : "Select a country first"} disabled={!country} />
      <Cell k="department" options={departmentOptions} onChange={onDepartment} placeholder={rows ? "Select department…" : "Select a company first"} disabled={!rows} />
      <Cell k="costCentre" options={costCenterOptions} onChange={onCostCentre} placeholder={rows ? "Select cost centre…" : "Select a company first"} disabled={!rows} />
    </div>
  );
}

/* ---------- documents uploader ---------- */
function DocumentField({ existing, pending, onAdd, onRemovePending, onRemoveExisting }) {
  const inputRef = useRef(null);
  return (
    <div>
      <div onClick={() => inputRef.current?.click()} className="focusable" style={{ border: "1.5px dashed var(--line-strong)",
        borderRadius: 10, padding: "16px", textAlign: "center", cursor: "pointer", color: "var(--text-soft)", background: "var(--surface-2)" }}>
        <Icon name="doc" size={18} style={{ color: "var(--green-600)" }} />
        <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4 }}>Click to upload documents</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>PDF, DOCX, XLSX or images · up to 15 MB each</div>
        <input ref={inputRef} type="file" multiple style={{ display: "none" }}
          onChange={(e) => { onAdd([...e.target.files]); e.target.value = ""; }} />
      </div>
      {(existing.length > 0 || pending.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {existing.map((d) => (
            <DocRow key={"e" + d.id} name={d.filename} sub={`${Math.round((d.size || 0) / 1024)} KB · uploaded`} onRemove={() => onRemoveExisting(d)} />
          ))}
          {pending.map((p) => (
            <DocRow key={"p" + p.id} name={p.file.name} sub={`${Math.round(p.file.size / 1024)} KB · pending upload`} onRemove={() => onRemovePending(p.id)} pending />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- certifications: multiselect + per-cert attachment & expiry ---------- */
function CertificationsField({ data, set, patch, docPropsFor, error }) {
  const selected = (data.certifications || []).filter((c) => c && c !== "None");
  const setExpiry = (cert, v) => patch({ certExpiry: { ...(data.certExpiry || {}), [cert]: v } });
  const lbl = { display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-soft)", marginBottom: 5 };
  return (
    <div style={{ gridColumn: "span 2" }}>
      <label style={lbl}>Certifications</label>
      <MultiSelect value={data.certifications || []} options={NESR.refs.certifications} onChange={(v) => set("certifications", v)} placeholder="Select all that apply…" />
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>Each selected certification gets its own attachment and expiry date below.</div>
      {selected.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          {selected.map((cert) => (
            <div key={cert} style={{ border: "1px solid var(--line)", borderRadius: 11, padding: 14, background: "var(--surface-2)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>{cert}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", alignItems: "start" }}>
                <div>
                  <label style={lbl}>Expiry date</label>
                  <input type="date" value={(data.certExpiry || {})[cert] || ""} onChange={(e) => setExpiry(cert, e.target.value)} style={inputStyle(false)} />
                </div>
                <div>
                  <label style={lbl}>Attachment</label>
                  <DocumentField {...docPropsFor("cert:" + cert)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function DocRow({ name, sub, onRemove, pending }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 9, border: "1px solid var(--line)", background: "var(--surface)" }}>
      <Icon name="doc" size={15} style={{ color: pending ? "var(--text-faint)" : "var(--green-600)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{sub}</div>
      </div>
      <button type="button" onClick={onRemove} style={{ border: "none", background: "transparent", color: "var(--text-faint)", cursor: "pointer", display: "grid", placeItems: "center" }}>
        <Icon name="x" size={15} />
      </button>
    </div>
  );
}

function Field({ f, value, onChange, error, lead, apps, docPropsFor }) {
  const id = "fld-" + f.key;
  const req = REQUIRED.includes(f.key);
  const common = {
    id, value: value ?? "", onChange: (e) => onChange(f.key, e.target.value), className: "focusable", style: inputStyle(error),
  };
  let input;
  if (f.file) {
    input = <DocumentField {...docPropsFor(f.key)} />;
  } else if (f.auto) {
    input = <input {...common} disabled value={value || "Auto-generated on submit"}
      style={{ ...inputStyle(false), background: "var(--surface-2)", color: "var(--text-faint)", fontFamily: "var(--mono)" }} />;
  } else if (f.computed) {
    input = <input type="number" disabled value={value ?? 0}
      style={{ ...inputStyle(false), background: "var(--surface-2)", color: "var(--text-soft)", fontWeight: 600 }} />;
  } else if (f.apps) {
    const names = apps.map((a) => a.name).filter((n) => n && n !== value);
    input = <MultiSelect value={value || []} options={[...new Set(names)].sort()} onChange={(v) => onChange(f.key, v)} placeholder="Link applications…" />;
  } else if (f.multi) {
    input = <MultiSelect value={value || []} options={NESR.refs[f.ref] || f.options || []} onChange={(v) => onChange(f.key, v)} placeholder="Select all that apply…" />;
  } else if (f.people) {
    input = <EmployeeSelect value={value} onChange={(v) => onChange(f.key, v)} placeholder="Search NESR directory…" error={error} />;
  } else if (f.ref) {
    input = (
      <select {...common}>
        <option value="">Select…</option>
        {(NESR.refs[f.ref] || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (f.long) {
    input = <textarea {...common} rows={2} style={{ ...inputStyle(error), resize: "vertical" }} />;
  } else if (f.date) {
    input = <input type="date" {...common} />;
  } else if (f.money || f.num) {
    input = <input type="number" inputMode="numeric" {...common} />;
  } else {
    input = <input type="text" {...common} />;
  }
  return (
    <div style={{ gridColumn: f.long || f.file || f.apps ? "span 2" : "auto" }}>
      <label htmlFor={id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "var(--text-soft)", marginBottom: 5 }}>
        {f.key === "name" ? "Application Name" : f.label}
        {req && <span style={{ color: "var(--st-reject)" }}>*</span>}
      </label>
      {f.key === "name" && lead
        ? <input type="text" {...common} placeholder="e.g. Drilling Telemetry Hub" style={{ ...inputStyle(error), fontSize: 15, fontWeight: 600, padding: "11px 13px" }} />
        : input}
      {f.hint && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 4, lineHeight: 1.4 }}>{f.hint}</div>}
      {error && <div style={{ fontSize: 11, color: "var(--st-reject)", marginTop: 4, fontWeight: 600 }}>{error}</div>}
    </div>
  );
}

export function AddForm() {
  const { submitApp, push, setView, prefill, setPrefill, apps, me } = useStore();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => {
    const init = prefill ? { ...emptyApp(), ...prefill } : emptyApp();
    init.tco = computeTco(init); // TCO always = license + maintenance
    return init;
  });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [existingDocs, setExistingDocs] = useState(() => (prefill?.documents ? [...prefill.documents] : []));
  const editing = !!prefill;

  const [costCenters, setCostCenters] = useState(_ccCache || []);
  useEffect(() => { loadCostCenters().then(setCostCenters); }, []);
  useEffect(() => () => setPrefill(null), [setPrefill]);

  const set = (k, v) => setData((d) => {
    const nd = { ...d, [k]: v };
    if (k === "annualLicenseCost" || k === "annualMaintCost") nd.tco = computeTco(nd);
    return nd;
  });
  const patch = (obj) => setData((d) => ({ ...d, ...obj }));
  const errors = {};
  REQUIRED.forEach((k) => { if (!String(data[k] || "").trim()) errors[k] = "Required"; });

  const stepDomainsRaw = STEPS[step].domains;
  const visibleDomainsFor = (domKeys) => domKeys
    .map((dk) => NESR.domains.find((d) => d.key === dk))
    .filter((dom) => dom && domainVisible(dom, data));

  const stepHasError = visibleDomainsFor(stepDomainsRaw).some((dom) => dom.fields.some((f) => fieldVisible(f, data) && errors[f.key]))
    || (STEPS[step].lead && errors.name);

  const next = () => { setTouched(true); if (!stepHasError) { setStep((s) => Math.min(STEPS.length - 1, s + 1)); setTouched(false); } };

  const uploadPending = async (appId) => {
    if (!pendingFiles.length) return;
    const groups = {};
    pendingFiles.forEach((p) => { (groups[p.category] ??= []).push(p.file); });
    for (const [category, files] of Object.entries(groups)) {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("me", me);
      fd.append("category", category);
      await fetch(`/api/apps/${appId}/documents`, { method: "POST", body: fd }).catch(() => {});
    }
  };

  const finalize = async (asDraft) => {
    setTouched(true);
    if (Object.keys(errors).length && !asDraft) {
      push("Please complete all required fields", "err");
      for (let i = 0; i < STEPS.length; i++) {
        const doms = visibleDomainsFor(STEPS[i].domains);
        if ((STEPS[i].lead && errors.name) || doms.some((dom) => dom.fields.some((f) => fieldVisible(f, data) && errors[f.key]))) { setStep(i); break; }
      }
      return;
    }
    setSaving(true);
    const saved = await submitApp(data, asDraft);
    if (saved && pendingFiles.length) await uploadPending(saved.id);
    setSaving(false);
    if (!saved) return;
    push(asDraft ? `Saved “${data.name}” as draft` : `“${data.name}” submitted for approval`, asDraft ? "info" : "ok");
    setView(asDraft ? "registry" : "approvals");
  };

  const removeExistingDoc = async (doc) => {
    setExistingDocs((d) => d.filter((x) => x.id !== doc.id));
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" }).catch(() => {});
  };
  const rid = () => Math.random().toString(36).slice(2);
  // Legacy docs (no category) belong to the general "documents" field.
  const docPropsFor = (category) => ({
    existing: existingDocs.filter((d) => (d.category || "documents") === category),
    pending: pendingFiles.filter((p) => p.category === category),
    onAdd: (files) => setPendingFiles((p) => [...p, ...files.map((f) => ({ id: rid(), file: f, category }))]),
    onRemovePending: (delId) => setPendingFiles((p) => p.filter((x) => x.id !== delId)),
    onRemoveExisting: removeExistingDoc,
  });

  return (
    <div style={{ padding: "20px 26px 60px", maxWidth: 1060, margin: "0 auto" }}>
      <button onClick={() => setView(editing ? "registry" : "dashboard")} style={{ ...textBtn, paddingLeft: 0, marginBottom: 8 }}>
        <Icon name="chevLeft" size={15} /> Cancel
      </button>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-.02em" }}>{editing ? `Revise “${prefill.name}”` : "Register a new application"}</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-soft)" }}>
          New applications are submitted to the IT Director ({headOfIT}) for approval before joining the registry.
        </p>
      </div>

      {/* stepper */}
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 22, flexWrap: "nowrap", gap: 0 }}>
        {STEPS.map((s, i) => (
          <Fragment key={i}>
            <button onClick={() => i < step && setStep(i)} style={{ display: "flex", alignItems: "center", gap: 8, border: "none",
              background: "transparent", cursor: i < step ? "pointer" : "default", flexShrink: 1, minWidth: 0, padding: 0 }}>
              <span style={{ width: 30, height: 30, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center",
                fontSize: 12.5, fontWeight: 700, transition: "all .2s",
                background: i < step ? "var(--green-600)" : i === step ? "var(--ink)" : "var(--line)", color: i <= step ? "#fff" : "var(--text-faint)" }}>
                {i < step ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: i === step ? 700 : 500, color: i === step ? "var(--text)" : "var(--text-faint)", textAlign: "left", lineHeight: 1.2 }}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? "var(--green-400)" : "var(--line)", margin: "15px 8px 0", borderRadius: 2, minWidth: 8 }} />}
          </Fragment>
        ))}
      </div>

      {/* body */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-sm)", minHeight: 340 }}>
        {step < STEPS.length - 1 ? (
          <div key={step} className="view-enter">
            {STEPS[step].lead && (
              <div style={{ marginBottom: 22 }}>
                <Field f={{ key: "name", label: "Application Name", hint: "The official name of the application." }} value={data.name} onChange={set} error={touched && errors.name} lead apps={apps} docPropsFor={docPropsFor} />
              </div>
            )}
            {visibleDomainsFor(stepDomainsRaw).map((dom) => (
              <div key={dom.key} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
                  <Icon name={dom.icon} size={15} style={{ color: "var(--green-600)" }} />
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{dom.label}</h3>
                </div>
                {dom.hint && <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 14 }}>{dom.hint}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px", marginTop: dom.hint ? 0 : 8 }}>
                  {(() => {
                    const items = []; let pickerDone = false;
                    dom.fields.filter((f) => fieldVisible(f, data)).forEach((f) => {
                      if (f.cascade) {
                        if (!pickerDone) { items.push(<CostCenterPicker key="__cc" value={data} patch={patch} mapping={costCenters} touched={touched} errors={errors} />); pickerDone = true; }
                        return;
                      }
                      if (f.certDetails) {
                        items.push(<CertificationsField key="__certs" data={data} set={set} patch={patch} docPropsFor={docPropsFor} />);
                        return;
                      }
                      items.push(<Field key={f.key} f={f} value={data[f.key]} onChange={set} error={touched && errors[f.key]} apps={apps} docPropsFor={docPropsFor} />);
                    });
                    return items;
                  })()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ReviewStep data={data} errors={errors} onJump={(i) => setStep(i)} docCount={existingDocs.length + pendingFiles.length} />
        )}
      </div>

      {/* footer nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 18 }}>
        {step > 0 && <button onClick={() => setStep((s) => s - 1)} style={ghostBtn}><Icon name="chevLeft" size={14} /> Back</button>}
        <div style={{ flex: 1 }} />
        <button onClick={() => finalize(true)} disabled={saving} style={{ ...ghostBtn }}><Icon name="doc" size={14} /> Save as draft</button>
        {step < STEPS.length - 1
          ? <button onClick={next} style={primaryBtn}>Continue <Icon name="chevRight" size={14} /></button>
          : <button onClick={() => finalize(false)} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}><Icon name="check" size={15} /> {saving ? "Submitting…" : "Submit for approval"}</button>}
      </div>
    </div>
  );
}

function ReviewStep({ data, errors, onJump, docCount }) {
  const missing = Object.keys(errors);
  return (
    <div className="view-enter">
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Review submission</h3>
      <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "var(--text-soft)" }}>Confirm the details below, then submit for IT Director approval.</p>

      {missing.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 13, borderRadius: 11, background: "var(--st-reject-bg)",
          border: "1px solid color-mix(in srgb, var(--st-reject) 22%, white)", marginBottom: 18 }}>
          <Icon name="alert" size={17} style={{ color: "var(--st-reject)" }} />
          <span style={{ fontSize: 12.5, color: "var(--st-reject)", fontWeight: 600 }}>
            {missing.length} required field{missing.length > 1 ? "s" : ""} still need completing before you can submit.
          </span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)", marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--green-100)", color: "var(--green-700)", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700 }}>
          {(data.name || "NEW").slice(0, 3).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{data.name || <span style={{ color: "var(--text-faint)" }}>Unnamed application</span>}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>{data.department || "—"} · {data.sourcing || "—"} · {data.hostingModel || "—"}{docCount ? ` · ${docCount} document${docCount > 1 ? "s" : ""}` : ""}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {NESR.domains.map((dom) => {
          const fields = dom.fields.filter((f) => fieldVisible(f, data) && !f.file && !f.auto);
          if (!fields.length) return null;
          const filled = fields.filter((f) => { const v = data[f.key]; return Array.isArray(v) ? v.length : String(v || "").trim(); });
          return (
            <div key={dom.key} style={{ border: "1px solid var(--line)", borderRadius: 11, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name={dom.icon} size={14} style={{ color: "var(--green-600)" }} />
                  <h4 style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>{dom.label}</h4>
                </div>
                <button onClick={() => onJump(STEPS.findIndex((s) => s.domains.includes(dom.key)))} style={{ ...textBtn, padding: "2px 6px", fontSize: 11.5 }}><Icon name="edit" size={12} /> Edit</button>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)" }} className="num">{filled.length}/{fields.length} fields completed</div>
              <div style={{ height: 5, background: "var(--line)", borderRadius: 99, marginTop: 6, overflow: "hidden" }}>
                <div style={{ width: (filled.length / fields.length * 100) + "%", height: "100%", background: "var(--green-400)", borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
