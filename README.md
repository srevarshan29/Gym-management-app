# GymDesk — Gym Management App

A multi-gym management platform for staff to manage members, membership packages,
subscription payments, and business accounting. Built with Next.js (App Router),
TypeScript, Firebase Firestore (primary operational data), PostgreSQL + Prisma
(staff auth and manual ledger), Auth.js (NextAuth v5), and Tailwind CSS with
shadcn/ui-style components.

Each gym's data is tenant-scoped by `gymId` in application code and Firestore rules.

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
| Record payments               |  yes  |  yes  |  yes  |
| Finance → Accounts (ledger) |  yes  |  no   |  no   |
| Delete members                |  yes  |  no   |  no   |
| Manage staff accounts         |  yes  |  no   |  no   |
| Browse exercise catalog       |  yes  |  yes  |  yes  |
| Import / refresh catalog      |  yes  |  yes  |  no   |
| Add custom exercises          |  yes  |  yes  |  yes  |
| Edit / delete custom exercises|  yes  |  yes  |  yes  |
| Edit / delete catalog imports |  yes  |  yes  |  no   |

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

## Data sources (finance & accounting)

Membership billing and manual business accounting use **two separate stores**:

| Data | Source | Used by |
| ---- | ------ | ------- |
| Member subscription payments | **Firestore** (`payments` collection) | Payments, receipts, dashboard revenue, Finance → Accounts (membership income) |
| Manual business ledger (rent, salaries, equipment, etc.) | **Postgres / Prisma** (`LedgerTransaction`) | Finance → Accounts (manual income/expense list) |

**Finance → Accounts** combines both sources:

- **Income** = all-time Firestore member payments for the gym + manual ledger income rows
- **Expense / Net** = manual ledger expenses only (member payments are never listed in the manual ledger table)

**Important:** Do **not** log membership fees as manual ledger income if they are already recorded under **Payments** — that would double-count income in the Net total. The Accounts page shows this breakdown explicitly.

Pending dues are tracked on subscriptions (`pendingAmount`), not as failed/pending payment documents.

## Production deployment checklist

Before pointing a live gym at this build:

1. **Environment variables** — copy `.env.example` and set at minimum:
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (Firestore is the primary runtime database)
   - `DATABASE_URL` (+ `DIRECT_URL` when using a pooler) for Prisma/Postgres (staff auth, manual ledger, legacy models)
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL` (canonical public URL for QR codes and member portal links)
   - Member portal (if enabled): `MEMBER_AUTH_GOOGLE_CLIENT_ID`, `MEMBER_AUTH_GOOGLE_CLIENT_SECRET`
   - Optional notifications: `FAST2SMS_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
   - **Supabase Storage** (gym logo + exercise media uploads): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (default `gym-assets`)

2. **Firestore rules & indexes** — deploy before production traffic:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   Rules live in `firestore.rules`; composite indexes in `firestore.indexes.json`. Run `npm run test:firestore:rules` locally against the emulator before deploying.

3. **Postgres migrations** — apply Prisma schema (manual ledger, staff users, etc.):
   ```bash
   npx prisma migrate deploy
   ```

4. **Seed** — create initial platform/owner accounts as needed:
   ```bash
   npm run db:seed
   npm run db:seed:firestore
   ```

   **Existing deployments only** — if staff login uses Firestore IDs but Postgres
   still has legacy Prisma `cuid` user/gym rows for the same owner email, reconcile once
   before manual ledger writes (dry-run first):
   ```bash
   npm run db:reconcile:tenant-ids
   TENANT_ID_RECONCILE_ALLOW_PRODUCTION=true npm run db:reconcile:tenant-ids -- --apply --confirm
   # Windows fallback if npm drops forwarded flags:
   TENANT_ID_RECONCILE_ALLOW_PRODUCTION=true npm run db:reconcile:tenant-ids:apply
   # Or set TENANT_ID_RECONCILE_APPLY=true TENANT_ID_RECONCILE_CONFIRM=true
   ```
   This migrates all Postgres `gymId`-scoped tenant rows to the canonical Firestore gym id,
   re-keys legacy `User.id` values via PostgreSQL `ON UPDATE CASCADE`, and never modifies
   Firestore. Fresh bootstrap seeds do not require this step.

   Integration verification (optional, uses a disposable Postgres database only):
   ```bash
   set TENANT_RECONCILE_INTEGRATION_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/gym_reconcile_test
   npx prisma migrate deploy
   npm run test:integration:tenant-reconcile
   ```

5. **Verify** — run `npx tsc --noEmit`, `npx vitest run --exclude tests/firestore/rules.test.ts`, `npm run test:firestore:rules`, and `npm run build` in CI or locally before release.

## Deploying to Vercel

1. Push this project to a Git repository and import it into Vercel.
2. Add the environment variables in the Vercel project settings (see **Production deployment checklist** above — at minimum `FIREBASE_*`, `DATABASE_URL`, `AUTH_SECRET`, and `NEXT_PUBLIC_APP_URL`).
3. Vercel runs `npm run build`, which runs `prisma generate`. Apply migrations
   against your production database with `npx prisma migrate deploy` (e.g. from a
   local shell pointed at the production `DATABASE_URL`, or a deploy hook).
4. Seed the owner once against production: `npm run db:seed` and `npm run db:seed:firestore`.

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
5. Set **`NEXT_PUBLIC_APP_URL`** to your **canonical public URL** (see below). QR registration links and member portal URLs always use this production origin — never a Vercel preview deployment URL (previews are password-protected).
6. Use `AUTH_TRUST_HOST=true` on production if OAuth callbacks fail host validation.

**Vercel — `NEXT_PUBLIC_APP_URL`**

| Situation | Value |
|-----------|--------|
| Default `*.vercel.app` host only | **Recommended** — `https://<your-production-project>.vercel.app` (e.g. `gym-management-app-gold.vercel.app`). If unset, the app uses Vercel's `VERCEL_PROJECT_PRODUCTION_URL` system variable (enable System Environment Variables in project settings). |
| **Custom domain** (e.g. `app.yourgym.com`) | **Required** — `https://app.yourgym.com` (no trailing slash). Ensures QR codes and shared links use your custom domain. |

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
