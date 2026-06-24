/* NextAuth (Auth.js v4) configuration — Microsoft Entra ID (Azure AD) via OIDC.

   Lives in server/ (NOT the type:module lib/ folder) so next-auth is only ever
   imported from a normal CommonJS-context module — this keeps webpack's CJS/ESM
   interop correct for the /api/auth route on Vercel.

   The provider is only registered when the three Entra credentials are present,
   so the app runs fine (password fallback) before SSO is configured.

   Roles are NOT assigned here — they're resolved authoritatively in /api/me
   from the database. On sign-in we upsert the user's profile and audit it.

   Required env: AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID,
   NEXTAUTH_SECRET, NEXTAUTH_URL. */
import AzureADProvider from "next-auth/providers/azure-ad";
import { upsertProfile, logAudit } from "../lib/db.js";

const clientId = process.env.AZURE_AD_CLIENT_ID;
const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
const tenantId = process.env.AZURE_AD_TENANT_ID;

export const ssoConfigured = !!(clientId && clientSecret && tenantId);

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET,
  session: { strategy: "jwt" },
  // Force __Secure- prefixed cookies in production so the cookie NextAuth sets
  // matches what the middleware reads (important behind a proxy / custom domain).
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: { signIn: "/login", error: "/login" },
  providers: ssoConfigured
    ? [
        AzureADProvider({
          clientId,
          clientSecret,
          tenantId,
          // User.Read lets us pull job title + photo from Microsoft Graph at login.
          authorization: { params: { scope: "openid profile email offline_access User.Read" } },
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.email = profile.email || profile.preferred_username || profile.upn || token.email;
        token.name = profile.name || token.name;
        token.jobTitle = profile.jobTitle || profile.job_title || token.jobTitle || null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = session.user || {};
      session.user.email = token.email;
      session.user.name = token.name;
      session.user.jobTitle = token.jobTitle || null;
      return session;
    },
  },
  events: {
    async signIn({ profile, account }) {
      // Profile upsert + audit must NEVER block sign-in (e.g. if the DB is
      // temporarily unreachable from the serverless function).
      try {
        const email = profile?.email || profile?.preferred_username || profile?.upn;
        if (!email) return;
        const displayName = profile?.name || email;
        let jobTitle = profile?.jobTitle || profile?.job_title || null;
        let photo = null;

        // Pull job title + a small profile photo from Microsoft Graph.
        const accessToken = account?.access_token;
        if (accessToken) {
          const headers = { Authorization: `Bearer ${accessToken}` };
          const [meRes, photoRes] = await Promise.all([
            fetch("https://graph.microsoft.com/v1.0/me?$select=displayName,jobTitle,mail,userPrincipalName", { headers }).catch(() => null),
            fetch("https://graph.microsoft.com/v1.0/me/photos/48x48/$value", { headers }).catch(() => null),
          ]);
          if (meRes?.ok) { const j = await meRes.json(); jobTitle = j.jobTitle || jobTitle; }
          if (photoRes?.ok) {
            const buf = Buffer.from(await photoRes.arrayBuffer());
            const ct = photoRes.headers.get("content-type") || "image/jpeg";
            photo = `data:${ct};base64,${buf.toString("base64")}`;
          }
        }

        await upsertProfile({ email, displayName, jobTitle, photo });
        await logAudit({
          actorEmail: email, actorName: displayName, action: "auth.login",
          entityType: "auth", summary: `${displayName} signed in via Microsoft SSO`,
        });
      } catch (e) {
        console.error("signIn event failed (non-fatal):", e.message);
      }
    },
  },
};
