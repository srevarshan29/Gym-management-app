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
- Settings: owners create staff accounts and assign roles

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
   Create additional staff from **Settings**.

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
      settings/        # staff management (owner only)
    actions/           # server actions (members, packages, payments, ...)
  components/          # UI primitives + feature components
  lib/                 # prisma client, queries, permissions, helpers
```
