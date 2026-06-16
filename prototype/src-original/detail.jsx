/* ===== Application Detail: all 8 domains + approval actions ===== */

function fieldValue(app, f) {
  const v = app[f.key];
  if (v === "" || v == null) return <span style={{ color: "var(--text-faint)" }}>—</span>;
  if (f.money) return <span className="num" title={fmtMoneyFull(v)}>{fmtMoneyFull(v)}</span>;
  if (f.num) return <span className="num">{fmtNum(v)}</span>;
  if (f.date) {
    const d = daysUntil(v); const overdue = d != null && d < 0; const soon = d != null && d >= 0 && d <= 45;
    return <span className="num" style={{ color: overdue ? "var(--st-reject)" : soon ? "var(--st-sunset)" : "inherit", fontWeight: overdue || soon ? 600 : 400 }}>
      {fmtDate(v)}{d != null && (overdue || soon) ? <span style={{ fontSize: 11, marginLeft: 6, fontWeight: 500 }}>{overdue ? `${-d}d overdue` : `in ${d}d`}</span> : ""}
    </span>;
  }
  if (f.key === "status") return <StatusChip value={v} />;
  if (f.key === "businessCriticality" || f.key === "drTier") return <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CRIT_C[critTier(v)] }} />{v}</span>;
  if (f.key === "openVulnerabilities") return <span style={{ color: VULN_C[v], fontWeight: 600 }}>{v}</span>;
  if (f.key === "containsPii") return <PiiCell v={v} />;
  if (["businessOwner", "itOwner", "primarySupportContact", "escalationContact"].includes(f.key))
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Avatar name={v} size={20} />{v}</span>;
  return v;
}

const DOMAIN_TONE = { identity: "--green-600", technical: "--st-dev", lifecycle: "#0E7490", risk: "--st-reject",
  financial: "--st-review", support: "#8B5CF6", value: "--green-700", dependencies: "#BE185D" };

function Detail({ app }) {
  const { setView, role, decide, push, setPrefill } = useStore();
  const [decision, setDecision] = useState(null); // 'Approved' | 'Rejected'
  const [note, setNote] = useState("");

  const isHead = role === "Head of IT";
  const t = critTier(app.businessCriticality);

  const doDecide = () => {
    decide(app.id, decision, note);
    push(decision === "Approved" ? `${app.name} approved & added to the registry` : `${app.name} rejected`, decision === "Approved" ? "ok" : "err");
    setDecision(null); setNote("");
  };

  return (
    <div style={{ padding: "18px 26px 50px", maxWidth: 1180, margin: "0 auto" }}>
      <button onClick={() => setView("registry")} style={{ ...textBtn, paddingLeft: 0, marginBottom: 12 }}>
        <Icon name="chevLeft" size={15} /> Back to registry
      </button>

      {/* header */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 22, boxShadow: "var(--shadow-sm)", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
          <div style={{ width: 56, height: 56, borderRadius: 13, background: "var(--green-100)", color: "var(--green-700)",
            display: "grid", placeItems: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{app.alias.slice(0, 3)}</div>
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
            {(role === "Submitter" && (app.approvalStatus === "Rejected" || app.approvalStatus === "Draft")) && (
              <button onClick={() => { setPrefill(app); setView("add"); }} style={primaryBtn}>
                <Icon name="edit" size={14} /> {app.approvalStatus === "Draft" ? "Edit & Submit" : "Revise & Resubmit"}
              </button>
            )}
            <button onClick={() => { exportCSV([app], `${app.alias}-${app.appId}.csv`); push("Exported application to CSV"); }} style={ghostBtn}>
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
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#8A5A12" }}>Awaiting Head of IT approval</div>
                <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>Submitted by {app.submittedBy} on {fmtDate(app.submittedDate)}</div>
              </div>
              {isHead ? (
                <div style={{ display: "flex", gap: 9 }}>
                  <button onClick={() => setDecision("Rejected")} style={{ ...ghostBtn, color: "var(--st-reject)", borderColor: "color-mix(in srgb, var(--st-reject) 35%, white)" }}>
                    <Icon name="x" size={14} /> Reject
                  </button>
                  <button onClick={() => setDecision("Approved")} style={primaryBtn}><Icon name="check" size={14} /> Approve</button>
                </div>
              ) : (
                <Chip color="--st-review" bg="--white" style={{ border: "1px solid color-mix(in srgb, var(--st-review) 30%, white)" }}>
                  Switch to Head of IT to action
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
        <HiStat label="Active Users" value={fmtNum(app.activeUsers)} sub={`of ${fmtNum(app.totalUserBase)} provisioned`} icon="user" />
        <HiStat label="Integrations" value={app.integrationCount} sub={app.integrationComplexity} icon="link" />
        <HiStat label="Open Vulns" value={app.openVulnerabilities} sub={`DR ${app.drTier.replace(/ –.*/, "")} · SLA ${app.slaAvailability}`} icon="shield" tone={VULN_C[app.openVulnerabilities]} />
      </div>

      {/* domain sections */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {window.NESR.domains.map((dom, i) => (
          <section key={dom.key} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18,
            boxShadow: "var(--shadow-sm)", gridColumn: dom.key === "value" || dom.key === "dependencies" ? "span 1" : "auto",
            animation: `cardIn .4s ease ${i * 0.04}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: `color-mix(in srgb, var(${DOMAIN_TONE[dom.key]}, ${DOMAIN_TONE[dom.key]}) 13%, white)`,
                color: DOMAIN_TONE[dom.key].startsWith("--") ? `var(${DOMAIN_TONE[dom.key]})` : DOMAIN_TONE[dom.key], display: "grid", placeItems: "center" }}>
                <Icon name={dom.icon} size={16} strokeWidth={1.9} />
              </span>
              <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, letterSpacing: "-.01em" }}>{dom.label}</h3>
            </div>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
              {dom.fields.map(f => (
                <div key={f.key} style={{ padding: "8px 0", borderTop: "1px solid var(--line)", gridColumn: f.long ? "span 2" : "auto" }}>
                  <dt style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600, letterSpacing: ".01em", marginBottom: 2 }}>{f.label}</dt>
                  <dd style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: "var(--text)", wordBreak: "break-word" }}>{fieldValue(app, f)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
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
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} autoFocus className="focusable"
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

Object.assign(window, { Detail });
