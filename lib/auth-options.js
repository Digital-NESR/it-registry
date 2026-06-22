/* NextAuth (Auth.js v4) configuration — Microsoft Entra ID (Azure AD) via OIDC.

   The provider is only registered when the three Entra credentials are present,
   so the app runs fine (password fallback) before SSO is configured.

   Roles are NOT assigned here — they're resolved authoritatively in /api/me
   from the database (system admins from env > user_roles > Business Owner).
   On sign-in we upsert the user's profile and write an audit entry.

   Required env: AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID,
   NEXTAUTH_SECRET, NEXTAUTH_URL. */
import AzureADProvider from "next-auth/providers/azure-ad";
import { upsertProfile, logAudit } from "./db.js";

const clientId = process.env.AZURE_AD_CLIENT_ID;
const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
const tenantId = process.env.AZURE_AD_TENANT_ID;

export const ssoConfigured = !!(clientId && clientSecret && tenantId);

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: ssoConfigured
    ? [
        AzureADProvider({
          clientId,
          clientSecret,
          tenantId,
          authorization: { params: { scope: "openid profile email offline_access" } },
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
    async signIn({ profile }) {
      const email = profile?.email || profile?.preferred_username || profile?.upn;
      if (!email) return;
      const displayName = profile?.name || email;
      const jobTitle = profile?.jobTitle || profile?.job_title || null;
      await upsertProfile({ email, displayName, jobTitle });
      await logAudit({
        actorEmail: email, actorName: displayName, action: "auth.login",
        entityType: "auth", summary: `${displayName} signed in via Microsoft SSO`,
      });
    },
  },
};
