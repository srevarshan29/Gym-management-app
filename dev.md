# GymDesk — Development Rules & Known Issues

This document exists because several of these problems have already happened once (sometimes twice) in the previous version of this app. Treat every rule below as a hard requirement, not a style preference — each one maps to a real bug that cost real time to find and fix.

## Hard Rules (never violate these)

1. **Tenant isolation everywhere.** Every read and write must be scoped to the correct `gymId`. This must be enforced in TWO places: application code AND Firestore Security Rules. Security Rules must actually be turned on and tested — do not ship with them disabled "for now" (this happened before with Postgres RLS and left a real, if unexploited, gap for months).

2. **Never write `undefined` to the database.** This crashed multiple production pages last time (Prisma equivalent). Always coerce optional/missing values to `null` or omit the field entirely — never pass a possibly-`undefined` variable straight into a write.

3. **Every mutating button/action needs a double-submit guard.** Any button that starts a database write (Start/Finish workout, Add Member, Record Payment, Delete anything, sidebar navigation, tab switches) must: disable itself while the action is in flight, and reliably re-enable on both success AND failure (use try/finally, not just try). A stuck "Starting..." button with no error shown was a repeated real bug — rapid double-clicking must never cause duplicate records or a frozen UI.

4. **No bulk-loading.** Every list (Members, Payments, Visitors, Exercises, etc.) must be paginated/limited server-side. Every search box must query scoped to the search term, never fetch-everything-then-filter-in-the-browser.

5. **Exercise data is never stored locally.** All exercise search/browse/demo content comes from a live ExerciseDB API call, filtered by the actual search term or muscle group tapped. No bulk import, no mirroring, no local video/GIF storage for this.

6. **Keep auth/session checks lightweight.** Avoid re-running expensive "who is this user" checks on every single click/navigation beyond what's actually needed for correctness — this was a previously-diagnosed, real cause of app-wide sluggishness.

7. **No secrets in code.** All API keys/credentials live in environment variables only. Before every commit, confirm `.env` (and any file with real credentials) is properly gitignored and not staged.

8. **Test on a real mobile viewport before calling any UI page done** — not just a resized desktop browser. Multiple past bugs (member profile overflow, chart rendering, landscape mode) only appeared on actual mobile widths.

9. **Verify in production, not just locally, before considering something fixed.** Local and deployed environments have behaved differently multiple times in this project (connection pooling, cold starts, environment variable mismatches). Always do a final pass on the live URL.

10. **Test rapid/repeated clicking and slow-network conditions**, not just the "happy path" single clean click — this is specifically how the double-submit and stuck-button bugs were originally found.

11. **Client components must never import server-only modules — including type-only imports.** Files with `"use client"` must not import from any module that pulls in `firebase-admin` or `getRepositories()`. Keep shared types used by client components in dedicated client-safe files (e.g. the `muscle-groups.ts`, `programme-types.ts` pattern), and have server-side lib files re-export from those if needed — not the other way around. Violating this can pass `tsc` but fail `next build` with `Module not found: Can't resolve 'net'`.

## Known Bugs to Fix (confirm resolved on the new Firestore build, don't just carry them over)

1. **Blank payment receipt preview.** After recording a payment, the "Payment receipt" confirmation screen shows correctly (✅ message, Download PDF button) but the receipt preview area itself renders as an empty white box instead of an actual preview of the receipt.

2. **Member profile page overflows on mobile (staff side).** When staff views an individual member's profile page (Subscription history, Payment history, Membership policy, Member portal status, Workout progress, etc.) on a phone screen, the layout is wider than the viewport — content is cut off / requires awkward horizontal scrolling to access.

## Known Technical Debt (carry over, address opportunistically — not blocking)
- Remove the "Testing Utilities" section (bulk delete members / clear emails) from Settings before any real gym owner uses the app — these are dangerous, testing-only actions that should not exist in a production-facing settings page.
- QR self-registration rate limiting was weak under Vercel's serverless model (in-memory rate limiting doesn't share state across instances) — revisit if/when this becomes a real-world concern.
- Some query-batching/performance optimizations from the Postgres era may no longer be relevant after the Firestore rebuild — re-evaluate rather than blindly porting over.

## Standard Testing Checklist (run this after every feature build, not just at the end)
- [ ] Feature works correctly for Owner, Admin, and Staff roles as appropriate
- [ ] Feature respects gym scoping — test with two different gyms, confirm no data crosses over
- [ ] Rapid double-click on every new button/submit — confirm no duplicate writes, no stuck UI
- [ ] Tested on an actual mobile-width viewport, portrait AND landscape if relevant
- [ ] Tested on the live deployed URL, not just localhost
- [ ] No `undefined` values reaching a database write (check especially optional fields)
- [ ] Loading states show immediately on click — no blank freeze
- [ ] `npx tsc --noEmit` (or equivalent) passes with no errors before committing
