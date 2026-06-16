# NESR · IT Application Registry

The single source of truth for every NESR IT application — a portfolio
dashboard, a filterable registry, a multi-step submission form, and a Head of
IT approval workflow.

Built with **Next.js (App Router)** and **PostgreSQL**, ready to deploy on
**Vercel**.

---

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Framework | Next.js 14 (App Router), React 18 |
| Backend   | Next.js route handlers (`app/api/**`) on the Node.js runtime |
| Database  | PostgreSQL (via `pg`) — works with Azure, Neon, Supabase, Vercel Postgres |
| Styling   | CSS design tokens + inline styles (no build-time CSS framework) |
| Hosting   | Vercel |

## Project layout

```
app/
  layout.jsx              root layout (fonts, theme)
  page.jsx                renders <App/>
  theme.css               design tokens & base styles
  api/apps/route.js                list (GET) + create (POST)
  api/apps/[id]/route.js           get / update / delete
  api/apps/[id]/decision/route.js  approve / reject
components/                client-side React views (App, Dashboard, Registry, …)
lib/
  schema.js               static field schema & reference lists (isomorphic)
  seed-data.js            generator for the 36 demo applications
  db.js                   PostgreSQL pool + query helpers
  auth.js                 placeholder for real auth (see "Adding auth" below)
scripts/seed.mjs          seeds the database
db/schema.sql             schema reference
prototype/                the original standalone HTML prototype (reference)
```

## Local development

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure the database**

   Copy the example env file and fill in your real values in `.env.local`
   (which is gitignored — never commit secrets):

   ```bash
   cp .env.example .env.local
   ```

   Set either `DATABASE_URL` or the individual `POSTGRES_*` parameters.

3. **Seed the database** with the 36 demo applications:

   ```bash
   npm run db:seed
   ```

   The table is created automatically. Re-run with `npm run db:seed -- --force`
   to wipe and reseed.

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the repo in Vercel — it auto-detects Next.js.
3. In **Project → Settings → Environment Variables**, add the same variables
   from your `.env.local` (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`,
   `POSTGRES_USER`, `POSTGRES_PASSWORD`, `PGSSL` — or a single `DATABASE_URL`).
4. Deploy.

> The database must be reachable from Vercel's servers. If your PostgreSQL
> instance is behind a private network/firewall (e.g. an internal Azure VM),
> allow Vercel's egress IPs or use a publicly reachable / tunneled endpoint.
> Seed the database once (locally against the same DB, or from any machine that
> can reach it) before the first deploy.

## Roles & approval workflow

A sidebar toggle switches between **Submitter** and **Head of IT** views:

- **Submitter** registers applications (saved as *Pending* or *Draft*).
- **Head of IT** approves or rejects pending applications. Approving an app
  under development flips its status to *Active*.

### Adding real authentication

The app currently trusts the client-side role toggle. To add real auth (a login
page or Azure AD SSO via NextAuth.js), see `lib/auth.js` — it documents the two
places to wire it in, and the `TODO(auth)` comments in the API routes mark
exactly where identity/role should be enforced server-side.

## API

| Method | Route | Purpose |
|--------|-------|---------|
| GET    | `/api/apps` | List all applications |
| POST   | `/api/apps` | Create (submit / save draft) |
| GET    | `/api/apps/:id` | Fetch one |
| PUT    | `/api/apps/:id` | Update / resubmit |
| DELETE | `/api/apps/:id` | Delete |
| POST   | `/api/apps/:id/decision` | Approve / reject |
