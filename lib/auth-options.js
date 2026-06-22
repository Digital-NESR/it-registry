/* NextAuth (Auth.js v4) configuration — Microsoft Entra ID (Azure AD) via OIDC.

   The provider is only registered when the three Entra credentials are present,
   so the app runs fine (password fallback) before SSO is configured.

   Required env (see .env.example):
     AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID
     NEXTAUTH_SECRET, NEXTAUTH_URL
   Optional role mapping:
     SSO_DEFAULT_ROLE, SSO_IT_DIRECTOR_EMAILS, SSO_MANAGER_EMAILS  */
import AzureADProvider from "next-auth/providers/azure-ad";

const clientId = process.env.AZURE_AD_CLIENT_ID;
const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
const tenantId = process.env.AZURE_AD_TENANT_ID;

export const ssoConfigured = !!(clientId && clientSecret && tenantId);

const APP_ROLES = ["Business Owner", "Manager", "IT Director"];
const emailList = (v) => (v || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/** Map an Entra profile / email to one of the app's three roles. */
export function mapRole(profile, email) {
  const claimRoles = [].concat(profile?.roles || []);
  const fromClaim = APP_ROLES.find((r) => claimRoles.includes(r));
  if (fromClaim) return fromClaim;
  const e = (email || "").toLowerCase();
  if (emailList(process.env.SSO_IT_DIRECTOR_EMAILS).includes(e)) return "IT Director";
  if (emailList(process.env.SSO_MANAGER_EMAILS).includes(e)) return "Manager";
  return APP_ROLES.includes(process.env.SSO_DEFAULT_ROLE) ? process.env.SSO_DEFAULT_ROLE : "Business Owner";
}

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
        token.given = profile.given_name;
        token.surname = profile.family_name;
        token.department = profile.department;
        token.jobTitle = profile.jobTitle || profile.job_title;
        token.employeeId = profile.employeeid || profile.employeeId;
        token.appRole = mapRole(profile, token.email);
      }
      return token;
    },
    async session({ session, token }) {
      session.user = session.user || {};
      session.user.email = token.email;
      session.user.name = token.name;
      session.user.role = token.appRole || process.env.SSO_DEFAULT_ROLE || "Business Owner";
      session.user.department = token.department || null;
      session.user.jobTitle = token.jobTitle || null;
      session.user.employeeId = token.employeeId || null;
      return session;
    },
  },
};
