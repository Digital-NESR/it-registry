/* Stateless signed-session helper used by the login API (Node runtime) and the
   middleware (Edge runtime). Uses Web Crypto HMAC-SHA256, available in both. */

export const SESSION_COOKIE = "nesr_session";
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function getKey() {
  const secret = process.env.SESSION_SECRET || "nesr-dev-secret-change-me";
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Create a signed token for the given session data. */
export async function createSession(data, ttlMs = DEFAULT_TTL_MS) {
  const payloadObj = { ...data, exp: Date.now() + ttlMs };
  const payload = b64url(enc.encode(JSON.stringify(payloadObj)));
  const sig = await crypto.subtle.sign("HMAC", await getKey(), enc.encode(payload));
  return payload + "." + b64url(new Uint8Array(sig));
}

/** Verify a token; returns the session data object or null. */
export async function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", await getKey(), fromB64url(sig), enc.encode(payload));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const data = JSON.parse(dec.decode(fromB64url(payload)));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}
