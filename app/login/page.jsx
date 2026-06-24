"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";

// Friendly text for the ?error= NextAuth sends back to /login on failure.
const ERR = {
  Configuration: "SSO is misconfigured on the server (check AZURE_AD_* / NEXTAUTH_SECRET / NEXTAUTH_URL).",
  AccessDenied: "Access was denied. Your account may not be permitted for this app.",
  OAuthSignin: "Couldn't start the Microsoft sign-in. Check the provider configuration.",
  OAuthCallback: "Microsoft sign-in failed on callback. Check the redirect URI and NEXTAUTH_URL.",
  Callback: "Sign-in callback failed (often NEXTAUTH_URL, redirect URI, or the database being unreachable).",
  OAuthAccountNotLinked: "This email is already linked to a different sign-in method.",
  default: "Sign-in failed. Please try again or contact NESR IT.",
};

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
  const [error, setError] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) setError(ERR[code] || ERR.default + ` (code: ${code})`);
  }, []);

  const onSSO = () => signIn("azure-ad", { callbackUrl: "/" });

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

        {error && <div style={errStyle}>{error}</div>}

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
const errStyle = { marginTop: 16, fontSize: 12.5, color: "#F0917F", lineHeight: 1.5 };
const footer = { marginTop: 26, fontSize: 11.5, color: "#5E6B63", letterSpacing: ".01em" };
