"use client";
/* ===== Add / Edit Application: multi-step submission form ===== */
import { Fragment, useState, useEffect } from "react";
import { useStore } from "./store";
import { NESR, headOfIT } from "@/lib/schema";
import { Icon, primaryBtn, ghostBtn, textBtn } from "./ui";

const REQUIRED = ["name", "businessOwner", "itOwner", "department", "classification", "status", "businessCriticality", "dataClassification"];

const STEPS = [
  { label: "Identity & Ownership", icon: "id", domains: ["identity"], lead: true },
  { label: "Technical & Lifecycle", icon: "chip", domains: ["technical", "lifecycle"] },
  { label: "Risk & Financial", icon: "shield", domains: ["risk", "financial"] },
  { label: "Operations & Value", icon: "wrench", domains: ["support", "value", "dependencies"] },
  { label: "Review & Submit", icon: "check", domains: [] },
];

function emptyApp() {
  const o = { name: "" };
  NESR.domains.forEach(d => d.fields.forEach(f => { o[f.key] = ""; }));
  return o;
}

function Field({ f, value, onChange, error, lead }) {
  const id = "fld-" + f.key;
  const req = REQUIRED.includes(f.key);
  const common = {
    id, value: value ?? "", onChange: e => onChange(f.key, e.target.value), className: "focusable",
    style: { width: "100%", padding: "9px 11px", borderRadius: 8, fontFamily: "inherit", fontSize: 13,
      border: "1px solid " + (error ? "var(--st-reject)" : "var(--line-strong)"), background: "var(--surface)", color: "var(--text)" },
  };
  let input;
  if (f.ref) {
    input = (
      <select {...common}>
        <option value="">Select…</option>
        {NESR.refs[f.ref].map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (f.long) {
    input = <textarea {...common} rows={2} style={{ ...common.style, resize: "vertical" }} />;
  } else if (f.date) {
    input = <input type="date" {...common} />;
  } else if (f.money || f.num) {
    input = <input type="number" inputMode="numeric" {...common} />;
  } else {
    input = <input type="text" {...common} />;
  }
  return (
    <div style={{ gridColumn: f.long ? "span 2" : "auto" }}>
      <label htmlFor={id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600,
        color: "var(--text-soft)", marginBottom: 5 }}>
        {f.key === "name" ? "Application Name" : f.label}
        {req && <span style={{ color: "var(--st-reject)" }}>*</span>}
      </label>
      {f.key === "name" && lead
        ? <input type="text" {...common} placeholder="e.g. Drilling Telemetry Hub" style={{ ...common.style, fontSize: 15, fontWeight: 600, padding: "11px 13px" }} />
        : input}
      {error && <div style={{ fontSize: 11, color: "var(--st-reject)", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

export function AddForm() {
  const { submitApp, push, setView, prefill, setPrefill } = useStore();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => prefill ? { ...prefill } : emptyApp());
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const editing = !!prefill;

  useEffect(() => () => setPrefill(null), [setPrefill]); // clear prefill on unmount

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const errors = {};
  REQUIRED.forEach(k => { if (!String(data[k] || "").trim()) errors[k] = "Required"; });
  const stepDomains = STEPS[step].domains;
  const stepHasError = stepDomains.some(dk => NESR.domains.find(d => d.key === dk).fields.some(f => errors[f.key]))
    || (STEPS[step].lead && errors.name);

  const next = () => { setTouched(true); if (!stepHasError) { setStep(s => Math.min(STEPS.length - 1, s + 1)); setTouched(false); } };

  const finalize = async (asDraft) => {
    setTouched(true);
    if (Object.keys(errors).length && !asDraft) {
      push("Please complete all required fields", "err");
      // jump to first step with an error
      for (let i = 0; i < STEPS.length; i++) { const ds = STEPS[i].domains; if ((STEPS[i].lead && errors.name) || ds.some(dk => NESR.domains.find(d => d.key === dk).fields.some(f => errors[f.key]))) { setStep(i); break; } }
      return;
    }
    setSaving(true);
    const saved = await submitApp(data, asDraft);
    setSaving(false);
    if (!saved) return; // error toast already shown by the store
    push(asDraft ? `Saved “${data.name}” as draft` : `“${data.name}” submitted for Head of IT approval`, asDraft ? "info" : "ok");
    setView(asDraft ? "registry" : "approvals");
  };

  return (
    <div style={{ padding: "20px 26px 60px", maxWidth: 920, margin: "0 auto" }}>
      <button onClick={() => setView(editing ? "registry" : "dashboard")} style={{ ...textBtn, paddingLeft: 0, marginBottom: 8 }}>
        <Icon name="chevLeft" size={15} /> Cancel
      </button>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, letterSpacing: "-.02em" }}>{editing ? `Revise “${prefill.name}”` : "Register a new application"}</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-soft)" }}>
          New applications are submitted to the Head of IT ({headOfIT}) for approval before joining the registry.
        </p>
      </div>

      {/* stepper */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
        {STEPS.map((s, i) => (
          <Fragment key={i}>
            <button onClick={() => i < step && setStep(i)} style={{ display: "flex", alignItems: "center", gap: 8, border: "none",
              background: "transparent", cursor: i < step ? "pointer" : "default", flexShrink: 0 }}>
              <span style={{ width: 30, height: 30, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center",
                fontSize: 12.5, fontWeight: 700, transition: "all .2s",
                background: i < step ? "var(--green-600)" : i === step ? "var(--ink)" : "var(--line)",
                color: i <= step ? "#fff" : "var(--text-faint)" }}>
                {i < step ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: i === step ? 700 : 500, color: i === step ? "var(--text)" : "var(--text-faint)", whiteSpace: "nowrap" }}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? "var(--green-400)" : "var(--line)", margin: "0 12px", borderRadius: 2, minWidth: 14 }} />}
          </Fragment>
        ))}
      </div>

      {/* body */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-sm)", minHeight: 340 }}>
        {step < STEPS.length - 1 ? (
          <div key={step} className="view-enter">
            {STEPS[step].lead && (
              <div style={{ marginBottom: 22 }}>
                <Field f={{ key: "name", label: "Application Name" }} value={data.name} onChange={set} error={touched && errors.name} lead />
              </div>
            )}
            {stepDomains.map(dk => {
              const dom = NESR.domains.find(d => d.key === dk);
              return (
                <div key={dk} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
                    <Icon name={dom.icon} size={15} style={{ color: "var(--green-600)" }} />
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{dom.label}</h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
                    {dom.fields.map(f => <Field key={f.key} f={f} value={data[f.key]} onChange={set} error={touched && errors[f.key]} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <ReviewStep data={data} errors={errors} onJump={(i) => setStep(i)} />
        )}
      </div>

      {/* footer nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 18 }}>
        {step > 0 && <button onClick={() => setStep(s => s - 1)} style={ghostBtn}><Icon name="chevLeft" size={14} /> Back</button>}
        <div style={{ flex: 1 }} />
        <button onClick={() => finalize(true)} disabled={saving} style={{ ...ghostBtn }}><Icon name="doc" size={14} /> Save as draft</button>
        {step < STEPS.length - 1
          ? <button onClick={next} style={primaryBtn}>Continue <Icon name="chevRight" size={14} /></button>
          : <button onClick={() => finalize(false)} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}><Icon name="check" size={15} /> {saving ? "Submitting…" : "Submit for approval"}</button>}
      </div>
    </div>
  );
}

function ReviewStep({ data, errors, onJump }) {
  const missing = Object.keys(errors);
  return (
    <div className="view-enter">
      <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>Review submission</h3>
      <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "var(--text-soft)" }}>Confirm the details below, then submit for Head of IT approval.</p>

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
          <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>{data.department || "—"} · {data.classification || "—"}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {NESR.domains.map((dom) => {
          const filled = dom.fields.filter(f => String(data[f.key] || "").trim());
          return (
            <div key={dom.key} style={{ border: "1px solid var(--line)", borderRadius: 11, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name={dom.icon} size={14} style={{ color: "var(--green-600)" }} />
                  <h4 style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>{dom.label}</h4>
                </div>
                <button onClick={() => onJump(STEPS.findIndex(s => s.domains.includes(dom.key)))} style={{ ...textBtn, padding: "2px 6px", fontSize: 11.5 }}><Icon name="edit" size={12} /> Edit</button>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-faint)" }} className="num">{filled.length}/{dom.fields.length} fields completed</div>
              <div style={{ height: 5, background: "var(--line)", borderRadius: 99, marginTop: 6, overflow: "hidden" }}>
                <div style={{ width: (filled.length / dom.fields.length * 100) + "%", height: "100%", background: "var(--green-400)", borderRadius: 99 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
