# GymDesk — Gym Management App

A single-gym management tool for staff to manage members, membership packages,
manually-recorded payments, and subscriptions. Built with Next.js (App Router),
TypeScript, PostgreSQL + Prisma, Auth.js (NextAuth v5), and Tailwind CSS with
shadcn/ui-style components.

This is a single-tenant app: all data belongs to one gym.

## Features

- Staff login with role-based access (Owner / Admin / Staff)
- Dashboard: active members, revenue this month (owner only), and members
  expiring soon, color-coded green (active) / amber (expiring soon) / red (expired)
- Members: searchable table, add/edit member, member profile with subscription
  and payment history, renew subscription
- Packages: create/edit custom membership packages (name, price, months/days)
- Payments: "Paid" tab (completed payments) and "Pending" tab (members whose
  current billing cycle has no matching payment) — owner only
- **Operations → Admins:** owners create staff accounts and assign roles

### Role permissions

| Capability                    | Owner | Admin | Staff |
| ----------------------------- | :---: | :---: | :---: |
| Add / edit members            |  yes  |  yes  |  yes  |
| Renew subscriptions           |  yes  |  yes  |  yes  |
| Create / edit packages        |  yes  |  yes  |  no   |
| View payments & revenue       |  yes  |  no   |  no   |
| Record payments               |  yes  |  no   |  no   |
| Delete members                |  yes  |  no   |  no   |
| Manage staff accounts         |  yes  |  no   |  no   |

## Prerequisites

- Node.js 18.18+ (or 20+)
- A PostgreSQL database. For deployment, a managed host such as
  [Neon](https://neon.tech) or [Supabase](https://supabase.com) works well and
  pairs cleanly with Vercel.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file from the example and fill in values:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — your Postgres connection string
   - `AUTH_SECRET` — generate one with `npx auth secret` (or `openssl rand -base64 32`)
   - `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` — the first owner login

3. Create the database schema and generate the Prisma client:

   ```bash
   npx prisma migrate dev --name init
   ```

4. Seed the initial owner account:

   ```bash
   npm run db:seed
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and sign in with the seeded owner credentials.
   Create additional staff from **Operations → Admins**.

## Useful scripts

- `npm run dev` — start the dev server
- `npm run build` — production build (runs `prisma generate` first)
- `npm run db:migrate` — run/apply Prisma migrations in development
- `npm run db:seed` — create the initial owner account
- `npm run db:studio` — open Prisma Studio to inspect data

## Deploying to Vercel

1. Push this project to a Git repository and import it into Vercel.
2. Add the environment variables (`DATABASE_URL`, `AUTH_SECRET`,
   `SEED_OWNER_*`) in the Vercel project settings.
3. Vercel runs `npm run build`, which runs `prisma generate`. Apply migrations
   against your production database with `npx prisma migrate deploy` (e.g. from a
   local shell pointed at the production `DATABASE_URL`, or a deploy hook).
4. Seed the owner once against production: `npm run db:seed`.

## Member portal (Google sign-in)

Members use a **separate** Auth.js instance (`/api/member-auth`) with Google OAuth.
Staff login is unchanged (email + password).

### Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. **OAuth consent screen** (APIs & Services): External app, add scopes `openid`, `email`, `profile`.
   While **Testing**, add test user Gmail addresses that will sign in.
3. **Credentials** → Create **OAuth client ID** → **Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` and your production URL.
   - Authorized redirect URIs:
     - `http://localhost:3000/api/member-auth/callback/google`
     - `https://YOUR_HOST/api/member-auth/callback/google`
4. Copy Client ID and Client secret into `.env`:
   - `MEMBER_AUTH_GOOGLE_CLIENT_ID`
   - `MEMBER_AUTH_GOOGLE_CLIENT_SECRET`
5. Set **`NEXT_PUBLIC_APP_URL`** to your **canonical public URL** (see below). Portal login links copied by staff also use the **current request host** on Vercel, so they work without this var on `*.vercel.app` deployments.
6. Use `AUTH_TRUST_HOST=true` on production if OAuth callbacks fail host validation.

**Vercel — `NEXT_PUBLIC_APP_URL`**

| Situation | Value |
|-----------|--------|
| Default `*.vercel.app` host only | Optional; links use the live site URL from the request. Set to `https://<your-project>.vercel.app` if you want env-only URLs (e.g. emails later). |
| **Custom domain** (e.g. `app.yourgym.com`) | **Required** — `https://app.yourgym.com` (no trailing slash). Ensures shared links and any non-request code paths use the custom domain, not a preview `VERCEL_URL`. |

Redeploy after changing this variable (it is baked into client bundles when set).

### Enabling access

1. Member must have an **email** on file (required on new staff/QR registration).
2. Staff opens the member profile and clicks **Enable member portal**, then shares the gym login link.
3. Member opens `/member/login/{gymToken}` and chooses **Continue with Google** with the same email.

## How subscription status & "Pending" work

- A subscription runs from `startDate` to `endDate` (computed from the package
  duration). Status is derived at read time:
  - green **Active**: more than 7 days remaining
  - amber **Expiring soon**: within the next 7 days
  - red **Expired**: end date has passed
- A member appears under **Payments → Pending** when their current (latest)
  subscription has no payment recorded against it. Recording a payment (either
  when adding/renewing a member or from the Pending tab) clears them.

## Project structure

```
prisma/
  schema.prisma        # data model
  seed.ts              # initial owner seed
src/
  auth.ts              # Auth.js config (Credentials + Prisma)
  auth.config.ts       # edge-safe auth config used by middleware
  middleware.ts        # route protection
  app/
    (auth)/login/      # login screen
    (app)/             # authenticated shell (sidebar) + pages
      page.tsx         # dashboard
      members/         # list, new, [id] profile, [id]/edit
      packages/        # packages CRUD
      payments/        # paid + pending tabs (owner only)
      operations/admins/ # staff accounts & roles (owner only)
      settings/        # account & gym profile
    actions/           # server actions (members, packages, payments, ...)
  components/          # UI primitives + feature components
  lib/                 # prisma client, queries, permissions, helpers
```
