/* Authentication placeholder.

   The app currently uses a client-side role toggle (Submitter / Head of IT)
   with no real login — see the RoleSwitcher in components/App.jsx. When you're
   ready to add real authentication (a login page, or SSO such as Azure AD via
   NextAuth.js), this is the single place to wire it in:

   1. Replace `getCurrentUser` below to read the authenticated session
      (e.g. from a NextAuth JWT / cookie) instead of trusting the client.
   2. In the API route handlers (app/api/apps/...), call `getCurrentUser(req)`
      and derive `submittedBy` / `approvedBy` from it rather than from the
      request body, and gate the decision endpoint on the "Head of IT" role.
      The TODO comments in those files mark exactly where.

   Until then this returns null and the routes fall back to the role/identity
   passed from the client, which is fine for an internal demo deployment. */

export const ROLES = {
  SUBMITTER: "Submitter",
  HEAD_OF_IT: "Head of IT",
};

/**
 * @returns {{ name: string, role: string } | null}
 * Returns the authenticated user, or null when auth is not yet configured.
 */
export async function getCurrentUser(/* req */) {
  return null;
}

/** Whether the given user may approve/reject applications. */
export function canApprove(user) {
  return user?.role === ROLES.HEAD_OF_IT;
}
