"use client";
/* ===== Application Detail: all domains + approval actions ===== */
import { useState } from "react";
import { useStore } from "./store";
import { NESR } from "@/lib/schema";
import {
  Icon, Avatar, Chip, StatusChip, ApprovalChip, CritChip, PiiCell, Modal,
  fmtMoney, fmtMoneyFull, fmtNum, fmtDate, daysUntil, CRIT_C, critTier,
  exportCSV, primaryBtn, ghostBtn, textBtn,
} from "./ui";

const fieldVisible = (f, app) => !f.hidden && (!f.showIf || (f.showIf.in || []).includes(app[f.showIf.key]));
const domainVisible = (dom, app) => !dom.showIf || (dom.showIf.in || []).includes(app[dom.showIf.key]);
const PEOPLE_KEYS = ["businessOwner", "itOwner", "primarySupportContact", "escalationContact", "serverOwner"];

function Documents({ docs }) {
  if (!docs || !docs.length) return <span style={{ color: "var(--text-faint)" }}>No documents uploaded.</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {docs.map((d) => (
        <a key={d.id} href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 9, border: "1px solid var(--line)",
            background: "var(--surface-2)", textDecoration: "none", color: "var(--text)" }}>
          <Icon name="doc" size={15} style={{ color: "var(--green-600)" }} />
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.filename}</span>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{Math.round((d.size || 0) / 1024)} KB</span>
          <Icon name="export" size={13} style={{ color: "var(--text-faint)" }} />
        </a>
      ))}
    </div>
  );
}

function Chips({ values }) {
  if (!values || !values.length) return <span style={{ color: "var(--text-faint)" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 5 }}>
      {values.map((v) => (
        <span key={v} style={{ padding: "2px 8px", borderRadius: 7, background: "var(--green-100)", color: "var(--green-700)", fontSize: 11.5, fontWeight: 600 }}>{v}</span>
      ))}
    </span>
  );
}

const docsInCategory = (app, category) => (app.documents || []).filter((d) => (d.category || "documents") === category);

function ContactsView({ contacts }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {contacts.map((c, i) => (
        <div key={i} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-2)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.name || "—"}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-soft)" }}>{[c.email, c.phone].filter(Boolean).join(" · ") || "—"}</div>
        </div>
      ))}
    </div>
  );
}

function CertsView({ app }) {
  const certs = (app.certifications || []).filter((c) => c && c !== "None");
  if (!certs.length) return <span style={{ color: "var(--text-faint)" }}>—</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {certs.map((cert) => {
        const docs = docsInCategory(app, "cert:" + cert);
        const exp = (app.certExpiry || {})[cert];
        const d = exp ? daysUntil(exp) : null;
        const expired = d != null && d < 0;
        const soon = d != null && d >= 0 && d <= 60;
        return (
          <div key={cert} style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "8px 11px", background: "var(--surface-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>{cert}</span>
              <span className="num" style={{ fontSize: 11.5, fontWeight: 600, color: expired ? "var(--st-reject)" : soon ? "var(--st-sunset)" : "var(--text-faint)" }}>
                {exp ? `${expired ? "Expired" : "Expires"} ${fmtDate(exp)}` : "No expiry set"}
              </span>
            </div>
            {docs.length > 0
              ? <div style={{ marginTop: 7 }}><Documents docs={docs} /></div>
              : <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-faint)" }}>No attachment</div>}
          </div>
        );
      })}
    </div>
  );
}

function fieldValue(app, f) {
  const v = app[f.key];
  if (f.certDetails) return <CertsView app={app} />;
  if (f.checkbox) return <Chip color={v === "Yes" ? "--st-active" : "--st-decom"} bg={v === "Yes" ? "--st-active-bg" : "--st-decom-bg"}>{v === "Yes" ? "Yes" : "No"}</Chip>;
  if (f.contacts) { const arr = Array.isArray(v) ? v : []; return arr.length ? <ContactsView contacts={arr} /> : <span style={{ color: "var(--text-faint)" }}>—</span>; }
  if (f.file) return <Documents docs={docsInCategory(app, f.key)} />;
  if (f.multi || f.apps) return <Chips values={Array.isArray(v) ? v : []} />;
  if (v === "" || v == null) return <span style={{ color: "var(--text-faint)" }}>—</span>;
  if (f.money) return <span className="num" title={fmtMoneyFull(v)}>{fmtMoneyFull(v)}</span>;
  if (f.num) return <span className="num">{fmtNum(v)}</span>;
  if (f.date) {
    const d = daysUntil(v); const overdue = d != null && d < 0; const soon = d != null && d >= 0 && d <= 45;
    return <span className="num" style={{ color: overdue ? "var(--st-reject)" : soon ? "var(--st-sunset)" : "inherit", fontWeight: overdue || soon ? 600 : 400 }}>
      {fmtDate(v)}{d != null && (overdue || soon) ? <span style={{ fontSize: 11, marginLeft: 6, fontWeight: 500 }}>{overdue ? `${-d}d overdue` : `in ${d}d`}</span> : ""}
    </span>;
  }
  if (f.toggle) return <Chip color="--st-dev" bg="--st-dev-bg">{v}</Chip>;
  if (f.key === "status") return <StatusChip value={v} />;
  if (f.key === "businessCriticality") return <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CRIT_C[critTier(v)] }} />{v}</span>;
  if (f.key === "containsPii") return <PiiCell v={v} />;
  if (f.ref === "yesNo") return <Chip color={v === "Yes" ? "--st-active" : "--st-decom"} bg={v === "Yes" ? "--st-active-bg" : "--st-decom-bg"}>{v}</Chip>;
  if (PEOPLE_KEYS.includes(f.key)) return <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Avatar name={v} size={20} />{v}</span>;
  return v;
}

const DOMAIN_TONE = { identity: "--green-600", technical: "--st-dev", onprem: "#0E7490", lifecycle: "#0E7490",
  risk: "--st-reject", resilience: "#3B5BB5", financial: "--st-review", vendor: "--st-review", support: "#8B5CF6",
  value: "--green-700", dependencies: "#BE185D", documents: "#475569" };

export function Detail({ app }) {
  const { setView, role, decide, push, setPrefill, canApprove, canEdit } = useStore();
  const [decision, setDecision] = useState(null);
  const [note, setNote] = useState("");
  const isApprover = canApprove;

  const doDecide = async () => {
    const saved = await decide(app.id, decision, note);
    if (saved) push(decision === "Approved" ? `${app.name} approved & added to the registry` : `${app.name} rejected`, decision === "Approved" ? "ok" : "err");
    setDecision(null); setNote("");
  };

  const editable = canEdit(app);

  return (
    <div style={{ padding: "18px 26px 50px", maxWidth: 1180, margin: "0 auto" }}>
      <button onClick={() => setView("registry")} style={{ ...textBtn, paddingLeft: 0, marginBottom: 12 }}>
        <Icon name="chevLeft" size={15} /> Back to registry
      </button>

      {/* header */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 22, boxShadow: "var(--shadow-sm)", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
          <div style={{ width: 56, height: 56, borderRadius: 13, background: "var(--green-100)", color: "var(--green-700)",
            display: "grid", placeItems: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{(app.alias || app.name || "").slice(0, 3)}</div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>{app.name}</h2>
              <StatusChip value={app.status} /><ApprovalChip value={app.approvalStatus} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 7, fontSize: 12.5, color: "var(--text-soft)", flexWrap: "wrap" }}>
              <span className="num">{app.appId}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="building" size={13} /> {app.department}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="cloud" size={13} /> {app.hostingModel}</span>
              <CritChip value={app.businessCriticality} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            {editable && (
              <button onClick={() => { setPrefill(app); setView("add"); }} style={primaryBtn}>
                <Icon name="edit" size={14} /> {app.approvalStatus === "Draft" ? "Edit & Submit" : app.approvalStatus === "Rejected" ? "Revise & Resubmit" : "Edit"}
              </button>
            )}
            <button onClick={() => { exportCSV([app], `${app.alias || app.name}-${app.appId}.csv`); push("Exported application to CSV"); }} style={ghostBtn}>
              <Icon name="export" size={14} /> Export
            </button>
          </div>
        </div>

        {/* approval banner */}
        {app.approvalStatus === "Pending" && (
          <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: "var(--st-review-bg)", border: "1px solid color-mix(in srgb, var(--st-review) 22%, white)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
              <Icon name="clock" size={18} style={{ color: "var(--st-review)" }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#8A5A12" }}>Awaiting IT Director approval</div>
                <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>Submitted by {app.submittedBy} on {fmtDate(app.submittedDate)}</div>
              </div>
              {isApprover ? (
                <div style={{ display: "flex", gap: 9 }}>
                  <button onClick={() => setDecision("Rejected")} style={{ ...ghostBtn, color: "var(--st-reject)", borderColor: "color-mix(in srgb, var(--st-reject) 35%, white)" }}>
                    <Icon name="x" size={14} /> Reject
                  </button>
                  <button onClick={() => setDecision("Approved")} style={primaryBtn}><Icon name="check" size={14} /> Approve</button>
                </div>
              ) : (
                <Chip color="--st-review" bg="--white" style={{ border: "1px solid color-mix(in srgb, var(--st-review) 30%, white)" }}>
                  Switch to IT Director to action
                </Chip>
              )}
            </div>
          </div>
        )}
        {app.approvalStatus === "Rejected" && (
          <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: "var(--st-reject-bg)", border: "1px solid color-mix(in srgb, var(--st-reject) 22%, white)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
              <Icon name="alert" size={18} style={{ color: "var(--st-reject)", marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--st-reject)" }}>Rejected by {app.approvedBy} on {fmtDate(app.decisionDate)}</div>
                {app.decisionNote && <div style={{ fontSize: 12.5, color: "var(--text-soft)", marginTop: 3 }}>“{app.decisionNote}”</div>}
              </div>
            </div>
          </div>
        )}
        {app.approvalStatus === "Approved" && (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-soft)" }}>
            <span style={{ width: 20, height: 20, borderRadius: 99, background: "var(--st-active-bg)", display: "grid", placeItems: "center", color: "var(--st-active)" }}><Icon name="check" size={12} strokeWidth={3} /></span>
            Approved by {app.approvedBy}{app.decisionDate && ` on ${fmtDate(app.decisionDate)}`} · Submitted by {app.submittedBy}
          </div>
        )}
      </div>

      {/* highlight stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        <HiStat label="Annual TCO" value={fmtMoney(app.tco)} sub={`License ${fmtMoney(app.annualLicenseCost)}`} icon="coin" />
        <HiStat label="Total Users" value={fmtNum(app.totalUserBase)} sub={`${app.seatCount ? fmtNum(app.seatCount) + " seats" : "user base"}`} icon="user" />
        <HiStat label="Integrations" value={app.integrationCount || "—"} sub={app.integrationComplexity} icon="link" />
        <HiStat label="Resilience" value={app.drAvailability === "Yes" ? "DR ready" : "No DR"} sub={`Backup ${app.hasBackup || "—"} · SLA ${app.slaAvailability || "—"}`} icon="shield" tone={app.drAvailability === "Yes" ? "var(--st-active)" : "var(--st-sunset)"} />
      </div>

      {/* domain sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {NESR.domains.filter((dom) => domainVisible(dom, app)).map((dom, i) => {
          const tone = DOMAIN_TONE[dom.key] || "--green-600";
          const fields = dom.fields.filter((f) => fieldVisible(f, app));
          return (
            <section key={dom.key} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18,
              boxShadow: "var(--shadow-sm)", gridColumn: dom.key === "documents" ? "span 2" : "auto", animation: `cardIn .4s ease ${i * 0.03}s both` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: `color-mix(in srgb, var(${tone}, ${tone}) 13%, white)`,
                  color: tone.startsWith("--") ? `var(${tone})` : tone, display: "grid", placeItems: "center" }}>
                  <Icon name={dom.icon} size={16} strokeWidth={1.9} />
                </span>
                <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, letterSpacing: "-.01em" }}>{dom.label}</h3>
              </div>
              <dl style={{ margin: 0, display: "grid", gridTemplateColumns: dom.key === "documents" ? "1fr" : "1fr 1fr", gap: "0" }}>
                {fields.map((f) => (
                  <div key={f.key} style={{ padding: "8px 0", borderTop: "1px solid var(--line)", gridColumn: f.long || f.file || f.apps || f.certDetails || f.contacts ? "span 2" : "auto" }}>
                    <dt style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, letterSpacing: ".01em", marginBottom: 2 }}>{f.label}</dt>
                    <dd style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: "var(--text)", wordBreak: "break-word" }}>{fieldValue(app, f)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>

      {/* decision modal */}
      <Modal open={!!decision} onClose={() => setDecision(null)} width={460} label="Decision">
        <div style={{ padding: 22 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>
            {decision === "Approved" ? "Approve application" : "Reject application"}
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-soft)" }}>
            {decision === "Approved"
              ? <>This adds <b>{app.name}</b> to the active registry and notifies {app.submittedBy}.</>
              : <>This returns <b>{app.name}</b> to {app.submittedBy} for revision.</>}
          </p>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-soft)", display: "block", marginBottom: 6 }}>
            {decision === "Approved" ? "Approval note (optional)" : "Reason for rejection"}
          </label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} autoFocus className="focusable"
            placeholder={decision === "Approved" ? "Conditions, comments…" : "Explain what needs to change…"}
            style={{ width: "100%", padding: 11, borderRadius: 9, border: "1px solid var(--line-strong)", fontFamily: "inherit", fontSize: 13, resize: "vertical" }} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
            <button onClick={() => setDecision(null)} style={ghostBtn}>Cancel</button>
            <button onClick={doDecide} disabled={decision === "Rejected" && !note.trim()}
              style={{ ...primaryBtn, background: decision === "Approved" ? "var(--green-600)" : "var(--st-reject)", opacity: decision === "Rejected" && !note.trim() ? 0.5 : 1 }}>
              <Icon name={decision === "Approved" ? "check" : "x"} size={14} /> {decision === "Approved" ? "Confirm approval" : "Confirm rejection"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function HiStat({ label, value, sub, icon, tone }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 13, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--text-soft)", fontWeight: 600, marginBottom: 8 }}>
        <Icon name={icon} size={14} /> {label}
      </div>
      <div className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.01em", lineHeight: 1, color: tone || "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 5 }}>{sub}</div>
    </div>
  );
}
