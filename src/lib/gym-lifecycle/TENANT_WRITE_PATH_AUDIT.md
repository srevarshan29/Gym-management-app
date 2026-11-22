# Tenant write path audit (Phase 27B.2I)

**Status:** Application-layer tenant mutations are guarded. **Complete enforcement is not claimed** while documented gaps remain (see `tenant-write-audit.ts`).

## Central enforcement

`assertTenantMutationAllowed(ctx, gymId)` loads the gym from Firestore (trusted `gymId`) and runs `evaluateTenantWritePolicy`.

| Layer | Protection |
|-------|------------|
| `TenantRepository` (`create` / `update` / `delete`) | Yes |
| `GymsRepository` counters (`nextMemberNumber`, dashboard counters) | Yes |
| `AttendanceRepository` check-in / visit writes | Yes |
| Member workout session mutations | Yes |
| Staff/member sessions | Active gym only (`gymAllowsTenantAccess`) |

## Policy rules (`evaluateTenantWritePolicy`)

- Gym must be **active** (scheduled deletion deactivates on request).
- No `deletionMode` or pending scheduled deletion.
- No deletion lock / purge-active states.

## Legitimate exceptions

| Path | Notes |
|------|--------|
| `gyms.patchLifecycle` / `setLifecycleStatus` | Super-admin / platform lifecycle only |
| Purge delete runners | Intentional destruction after authority checks |
| Operator `scripts/*` | Out-of-band; documented `purgeException` |

## Remaining gaps (block destructive purge)

See `TENANT_WRITE_PATH_GAPS` in `tenant-write-audit.ts` — e.g. future device/webhook integrations not yet wired to the guard.

## Scheduled deletion behaviour

`scheduleGymDeletion`: deactivates gym, rotates `registrationToken`, sets `deletionMode: scheduled`, bumps staff credentials.

`cancelScheduledDeletionOnReactivate`: clears deletion fields, reactivates, rotates token again, cancels bound job.

Immediate deletion: separate irreversible `deletionLockedAt` lock.