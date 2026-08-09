# Member portal — RLS follow-up (Phase 5)

When `USE_RLS_ROLE=true`, the app connects as `gym_app` and tenant RLS policies allow **any row in the gym** for tables like `Member`, `Payment`, and `Subscription`. Staff flows use `withTenant(gymId)`; that is correct for staff but **not** for the member portal.

## Required before enabling RLS for portal traffic

1. Add session GUC `app.member_id` and SQL helper `app_current_member_id()`.
2. Add `withMemberPortalContext(gymId, memberId, fn)` in `src/lib/db-context.ts` (sets `app.gym_id` + `app.member_id`, clears super-admin / platform_lookup flags).
3. Add **member-portal SELECT policies** (examples):
   - `Member`: `"id" = app_current_member_id()`
   - `Payment`, `Subscription`, `DietPlan`, `WorkoutPlan`: `"memberId" = app_current_member_id()`
   - `GymEvent`: gym-wide read OK (`"gymId" = app_current_gym_id()`) — no member PII
4. Route all `src/lib/member-portal/*` queries through `withMemberPortalContext` when `isRlsEnforced()` is true.

## Current state (`USE_RLS_ROLE=false`)

Portal code uses `prisma` with **hard-coded `memberId` from `requireMember()`** only. Staff auth remains on a separate cookie and `requireGym()` paths are unchanged.

## Verification checklist

- Member JWT cannot access staff routes (separate cookie + middleware branch).
- Tampering `/member/*` URLs does not accept arbitrary `memberId` query params for data loads.
- IDOR tests: two members in same gym cannot read each other's payments/plans.
