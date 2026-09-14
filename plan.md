# GymDesk — Technical Plan (Firebase Rebuild)

## 1. High-Level Architecture

| Layer | Technology | Notes |
|---|---|---|
| Hosting | Vercel | Unchanged — no reason to move |
| App framework | Next.js 14 (App Router) | Unchanged |
| **Database** | **Firestore (Firebase)** | **Replaces Neon/Postgres/Prisma** |
| File storage (photos, logos) | Supabase Storage | Unchanged — kept because Firebase free tier no longer includes storage |
| Staff auth | Auth.js (credentials) | Unchanged, reconnected to Firestore |
| Member auth | Google OAuth (separate instance) | Unchanged, reconnected to Firestore |
| Exercise content | ExerciseDB (external API) | New — live-queried only, never stored |

**This is a hybrid setup, chosen specifically to avoid new costs:** Firestore free tier (Spark plan) covers the database; Supabase free tier continues to cover file storage; Vercel free tier continues to cover hosting.

## 2. Migration Approach
This is **not** an in-place migration (unlike the earlier Postgres→Postgres move). Firestore is a fundamentally different (NoSQL/document) database, so this is a **parallel rebuild + hard cutover**:

1. Fix only truly blocking bugs on the current app (see dev.md known bugs list) — do NOT build new features on the soon-to-be-replaced database.
2. Design the Firestore data model (below) and rebuild the data-access layer.
3. Reconnect existing auth (staff + member) to Firestore instead of Postgres.
4. Re-verify **every existing feature** works correctly on the new foundation before adding anything new.
5. Only after step 4 passes, build the new features listed in product.md.

## 3. Firestore Data Model (draft — refine collection-by-collection with Cursor before building)

Mirror the existing structure as top-level collections, each document carrying a `gymId` field for tenant scoping:

- `gyms/{gymId}`
- `users/{userId}` (staff accounts — role, gymId)
- `packages/{packageId}`
- `members/{memberId}` (includes portal auth fields, stats, fitness goal)
- `subscriptions/{subscriptionId}`
- `payments/{paymentId}`
- `receipts/{receiptId}`
- `gymProfiles/{gymId}`
- `visitors/{visitorId}`
- `employees/{employeeId}`
- `events/{eventId}`
- `ledgerTransactions/{transactionId}`
- `exercises/{exerciseId}` (custom, gym-added exercises only — NOT the ExerciseDB library)
- `workoutPlans/{planId}` → subcollections or embedded arrays for days/exercises (decide based on typical size — likely embedded, since a plan's exercise list is small and always read together)
- `workoutSessions/{sessionId}` → embedded set logs (same reasoning)
- `dietPlans/{planId}`

**Multi-tenant isolation:** enforced two ways —
- Every query filtered by `gymId` in application code (as before)
- **Firestore Security Rules** as the database-level backstop (Firestore's equivalent of the RLS work done previously) — must actually be turned on and tested this time, not left disabled like the old `USE_RLS_ROLE=false` situation.

## 4. Performance Rules (hard requirements, not suggestions)

These come directly from real problems experienced in the previous version and from the owner's explicit direction:

1. **Never bulk-load a full collection.** Every list view (Members, Payments, Visitors, etc.) must be paginated or limited (e.g. load 20-50 at a time, load more on scroll/request).
2. **Every search is server/API-side, never client-side-filter-after-fetch-all.** Typing in a search box must trigger a scoped query (Firestore query with `where`/prefix matching, or a scoped API call) — never download everything and filter in the browser.
3. **Exercise search/browse always calls the ExerciseDB API directly, filtered by the search term or muscle-group tap.** Never bulk-import or mirror ExerciseDB into Firestore. Zero exercise media files are ever stored in our own storage.
4. **Page navigation must feel fast:** show a lightweight loading indicator immediately on click (never a blank freeze), and avoid redundant "who is this user" database round-trips on every single navigation (this was a real, previously-diagnosed cause of slowness — keep session/auth checks lightweight).
5. **PWA basics:** app shell (layout, static assets) cached via service worker so repeat opens are fast; real data (members, payments, etc.) always fetched fresh — no offline editing of business data in this phase.

## 5. Auth
- Keep the **dual auth system** exactly as before: Auth.js for staff, separate Google OAuth flow for members.
- Both now read/write user identity against Firestore collections instead of Postgres tables.
- Re-verify: staff permission checks, member-to-gym scoping, and the JWT/session staleness protections (immediate access revocation on role change/deletion) all still function correctly after the swap.

## 6. Rollout Order (recommended)
1. Firestore project setup + security rules skeleton
2. Data model + core collections (gyms, users, members, subscriptions, payments) — get basic CRUD + auth working end-to-end first
3. Re-verify staff side fully (Dashboard, Members, Payments, Packages, Operations, Reports)
4. Re-verify Member Portal fully (Overview, Profile, Payments, Diet, Workout, Tools)
5. Re-verify Workout Tracking (plans, sessions, progress graphs) — most complex existing feature
6. Fix the two known bugs (blank receipt preview, member-profile mobile overflow) — confirm they don't reappear on the new stack
7. Add PWA basics
8. Add ExerciseDB integration
9. Add Nutrition Tracking, Daily Goals Wizard, Cardio Tracker (new features)
10. Final full mobile + multi-gym isolation + rapid-click stress test pass

## 7. Explicit Decisions Made (don't revisit without reason)
- Firestore over staying on Neon: chosen for better handling of many concurrent Member Portal users, despite requiring a full data-layer rewrite.
- Supabase Storage retained for files (not moving to Firebase Storage, which now requires a paid plan).
- Vercel retained for hosting.
- No Firebase Auth adoption in this phase — keep existing Auth.js + Google OAuth dual system to avoid compounding rework, even though a full rebuild is happening anyway.
