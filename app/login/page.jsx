"use client";
import { useState, useEffect } from "react";

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect width="10" height="10" x="1" y="1" fill="#F25022" />
      <rect width="10" height="10" x="12" y="1" fill="#7FBA00" />
      <rect width="10" height="10" x="1" y="12" fill="#00A4EF" />
      <rect width="10" height="10" x="12" y="12" fill="#FFB900" />
    </svg>
  );
}

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : {}))
      .then((p) => setSsoEnabled(!!(p && p["azure-ad"])))
      .catch(() => {});
  }, []);

  const onSSO = () => {
    if (ssoEnabled) {
      window.location.href = "/api/auth/signin/azure-ad?callbackUrl=" + encodeURIComponent("/");
      return;
    }
    setNote("Microsoft SSO isn’t configured yet — use the access password below for now.");
    setShowPw(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Incorrect password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={logoTile}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nesr-logo.png" alt="NESR" style={{ width: 46, height: 46, objectFit: "contain" }} />
        </div>

        <h1 style={title}>NESR IT Registry</h1>
        <p style={subtitle}>
          Sign in with your NESR Microsoft account to access the IT Application Registry.
        </p>

        <button type="button" onClick={onSSO} style={ssoBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#2a6f44")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#307c4c")}>
          <MicrosoftLogo /> Continue with SSO
        </button>

        {note && <div style={noteStyle}>{note}</div>}

        {!showPw ? (
          <button type="button" onClick={() => setShowPw(true)} style={linkBtn}>
            Use access password instead
          </button>
        ) : (
          <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
            <div style={divider}><span style={dividerText}>or sign in with password</span></div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Access password"
              autoFocus
              style={{ ...input, borderColor: error ? "#E5614F" : "rgba(255,255,255,.12)" }}
            />
            {error && <div style={errStyle}>{error}</div>}
            <button type="submit" disabled={busy || !password} style={{ ...pwBtn, opacity: busy || !password ? 0.55 : 1 }}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <div style={footer}>NESR Internal Tool · Authorized Personnel Only</div>
      </div>
    </div>
  );
}

const wrap = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: 20,
  background:
    "radial-gradient(900px 520px at 50% 42%, rgba(48,124,76,.30), rgba(8,15,11,0) 70%), " +
    "radial-gradient(700px 600px at 50% 120%, rgba(48,124,76,.22), rgba(8,15,11,0) 60%), #080c09",
  fontFamily: "var(--font), system-ui, sans-serif",
};
const card = {
  width: "100%",
  maxWidth: 440,
  background: "#14181500",
  backgroundColor: "rgba(20,24,21,.72)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 18,
  padding: "40px 36px 30px",
  boxShadow: "0 30px 80px rgba(0,0,0,.55)",
  backdropFilter: "blur(8px)",
  textAlign: "center",
};
const logoTile = {
  width: 64, height: 64, borderRadius: 16, background: "#fff",
  display: "grid", placeItems: "center", margin: "0 auto 22px",
  boxShadow: "0 6px 20px rgba(0,0,0,.35)",
};
const title = { margin: 0, color: "#fff", fontSize: 27, fontWeight: 700, letterSpacing: "-.02em" };
const subtitle = { margin: "10px auto 26px", color: "#9AA6A0", fontSize: 13.5, lineHeight: 1.5, maxWidth: 320 };
const ssoBtn = {
  width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
  padding: "13px 16px", borderRadius: 11, border: "none", background: "#307c4c",
  color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer", transition: "background .15s",
};
const linkBtn = {
  marginTop: 16, background: "transparent", border: "none", color: "#8FA89A",
  fontSize: 12.5, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
};
const noteStyle = { marginTop: 14, fontSize: 12, color: "#C5E0D2", lineHeight: 1.5 };
const divider = { position: "relative", textAlign: "center", margin: "4px 0 16px" };
const dividerText = { fontSize: 11, color: "#6B7A72", background: "transparent", textTransform: "uppercase", letterSpacing: ".06em" };
const input = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.04)", color: "#fff", fontSize: 14, fontFamily: "inherit", outline: "none",
};
const errStyle = { marginTop: 8, fontSize: 12.5, color: "#F0917F", textAlign: "left" };
const pwBtn = {
  width: "100%", marginTop: 14, padding: "12px 16px", borderRadius: 11, border: "none",
  background: "#307c4c", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const footer = { marginTop: 26, fontSize: 11.5, color: "#5E6B63", letterSpacing: ".01em" };
