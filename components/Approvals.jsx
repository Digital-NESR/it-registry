"use client";
/* ===== Approvals inbox (Head of IT) ===== */
import { useState } from "react";
import { useStore } from "./store";
import {
  Icon, Avatar, ApprovalChip, CritChip, Modal,
  fmtMoney, fmtDate, primaryBtn, ghostBtn, textBtn,
} from "./ui";

export function Approvals() {
  const { visibleApps: apps, canApprove, decide, push, goDetail } = useStore();
  const [tab, setTab] = useState("Pending");
  const [reject, setReject] = useState(null); // app being rejected
  const [note, setNote] = useState("");
  const isHead = canApprove;

  const buckets = {
    Pending: apps.filter(a => a.approvalStatus === "Pending").sort((a, b) => new Date(a.submittedDate) - new Date(b.submittedDate)),
    Approved: apps.filter(a => a.approvalStatus === "Approved").sort((a, b) => new Date(b.decisionDate || 0) - new Date(a.decisionDate || 0)),
    Rejected: apps.filter(a => a.approvalStatus === "Rejected"),
    Draft: apps.filter(a => a.approvalStatus === "Draft"),
  };
  const list = buckets[tab];

  const approve = async (a) => { const saved = await decide(a.id, "Approved", ""); if (saved) push(`${a.name} approved & added to the registry`); };
  const doReject = async () => { const saved = await decide(reject.id, "Rejected", note); if (saved) push(`${reject.name} rejected`, "err"); setReject(null); setNote(""); };

  const tabs = [["Pending", buckets.Pending.length], ["Approved", buckets.Approved.length], ["Rejected", buckets.Rejected.length], ["Draft", buckets.Draft.length]];

  return (
    <div style={{ padding: "20px 26px 50px", maxWidth: 1000, margin: "0 auto" }}>
      {!isHead && (
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: 14, borderRadius: 12, background: "var(--st-dev-bg)",
          border: "1px solid color-mix(in srgb, var(--st-dev) 20%, white)", marginBottom: 18 }}>
          <Icon name="eye" size={18} style={{ color: "var(--st-dev)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--st-dev)" }}>Read-only view</div>
            <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>Approval decisions can only be made by the IT Director. Switch role in the sidebar to action this queue.</div>
          </div>
        </div>
      )}

      {/* summary banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", borderRadius: 14, marginBottom: 20,
        background: "linear-gradient(120deg, var(--ink), #2c2c28)", color: "#fff", boxShadow: "var(--shadow-md)" }}>
        <span style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(106,175,142,.2)", display: "grid", placeItems: "center", color: "var(--green-400)" }}>
          <Icon name="inbox" size={22} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{buckets.Pending.length} application{buckets.Pending.length !== 1 ? "s" : ""} awaiting your decision</div>
          <div style={{ fontSize: 12.5, color: "#A9C7B6" }}>Each must be approved by the IT Director before entering the active registry.</div>
        </div>
        {buckets.Pending.length > 0 && tab !== "Pending" && (
          <button onClick={() => setTab("Pending")} style={{ ...primaryBtn, background: "var(--green-600)" }}>Review queue</button>
        )}
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
        {tabs.map(([t, n]) => (
          <button key={t} onClick={() => setTab(t)} style={{ position: "relative", padding: "9px 14px", border: "none", background: "transparent",
            fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? "var(--text)" : "var(--text-faint)" }}>
            {t} <span className="num" style={{ fontSize: 12, color: tab === t ? "var(--green-600)" : "var(--text-faint)" }}>({n})</span>
            {tab === t && <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 2.5, background: "var(--green-600)", borderRadius: 3 }} />}
          </button>
        ))}
      </div>

      {/* list */}
      {list.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-faint)" }}>
          <Icon name="check" size={30} style={{ opacity: .4 }} />
          <div style={{ marginTop: 10, fontSize: 13.5 }}>Nothing in “{tab}”.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {list.map((a, i) => (
            <div key={a.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18,
              boxShadow: "var(--shadow-sm)", animation: `cardIn .35s ease ${i * 0.03}s both` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 15, flexWrap: "wrap" }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--green-100)", color: "var(--green-700)",
                  display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{(a.alias || a.name || "").slice(0, 3)}</div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                    <button onClick={() => goDetail(a.id)} style={{ border: "none", background: "transparent", padding: 0, fontSize: 15.5, fontWeight: 700, cursor: "pointer", letterSpacing: "-.01em", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360, textAlign: "left" }}>{a.name}</button>
                    <CritChip value={a.businessCriticality} />
                    {a.approvalStatus !== "Pending" && <ApprovalChip value={a.approvalStatus} />}
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 12.5, color: "var(--text-soft)", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Avatar name={a.submittedBy} size={18} /> {a.submittedBy}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="building" size={13} /> {a.department}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="clock" size={13} /> {fmtDate(a.submittedDate)}</span>
                  </div>
                  {/* quick facts */}
                  <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
                    <Fact label="Classification" value={a.classification} />
                    <Fact label="Hosting" value={a.hostingModel} />
                    <Fact label="Data" value={a.dataClassification} />
                    <Fact label="PII" value={a.containsPii} warn={a.containsPii === "Yes"} />
                    <Fact label="Est. TCO" value={fmtMoney(a.tco)} />
                    {a.approvalStatus === "Rejected" && a.decisionNote && <Fact label="Reason" value={a.decisionNote} warn wide />}
                  </div>
                </div>
                {/* actions */}
                {a.approvalStatus === "Pending" && isHead && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => approve(a)} style={{ ...primaryBtn, justifyContent: "center" }}><Icon name="check" size={14} /> Approve</button>
                    <button onClick={() => setReject(a)} style={{ ...ghostBtn, justifyContent: "center", color: "var(--st-reject)", borderColor: "color-mix(in srgb, var(--st-reject) 30%, white)" }}><Icon name="x" size={14} /> Reject</button>
                    <button onClick={() => goDetail(a.id)} style={{ ...textBtn, justifyContent: "center" }}>View details</button>
                  </div>
                )}
                {a.approvalStatus === "Draft" && (
                  <button onClick={() => goDetail(a.id)} style={ghostBtn}><Icon name="eye" size={14} /> Open</button>
                )}
                {(a.approvalStatus === "Approved" || a.approvalStatus === "Rejected") && (
                  <div style={{ textAlign: "right", fontSize: 11.5, color: "var(--text-faint)", flexShrink: 0 }}>
                    <div style={{ fontWeight: 600, color: a.approvalStatus === "Approved" ? "var(--st-active)" : "var(--st-reject)" }}>{a.approvalStatus}</div>
                    <div>{a.approvedBy}</div>
                    <div className="num">{fmtDate(a.decisionDate)}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* reject modal */}
      <Modal open={!!reject} onClose={() => setReject(null)} width={460} label="Reject application">
        {reject && (
          <div style={{ padding: 22 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>Reject “{reject.name}”</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-soft)" }}>This returns the request to {reject.submittedBy} for revision.</p>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-soft)", display: "block", marginBottom: 6 }}>Reason for rejection</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} autoFocus className="focusable" placeholder="Explain what needs to change…"
              style={{ width: "100%", padding: 11, borderRadius: 9, border: "1px solid var(--line-strong)", fontFamily: "inherit", fontSize: 13, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button onClick={() => setReject(null)} style={ghostBtn}>Cancel</button>
              <button onClick={doReject} disabled={!note.trim()} style={{ ...primaryBtn, background: "var(--st-reject)", opacity: note.trim() ? 1 : 0.5 }}>
                <Icon name="x" size={14} /> Confirm rejection
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Fact({ label, value, warn, wide }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6, padding: "4px 10px", borderRadius: 8,
      background: warn ? "var(--st-reject-bg)" : "var(--surface-2)", border: "1px solid var(--line)", maxWidth: wide ? 360 : "none" }}>
      <span style={{ fontSize: 10.5, color: "var(--text-faint)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: warn ? "var(--st-reject)" : "var(--text)", whiteSpace: wide ? "normal" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value || "—"}</span>
    </span>
  );
}
