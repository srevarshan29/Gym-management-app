import type { DashboardStatePatch } from "@/lib/firestore/repositories/member-portal-dashboard-state";
import type { MemberPortalDashboardStateDoc } from "@/lib/firestore/types";
import type { ResolvedDashboardMessage } from "@/lib/member-portal/dashboard-message-engine";

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function dashboardStatePatchFromMessage(
  message: ResolvedDashboardMessage,
): DashboardStatePatch {
  return {
    recentMessageKeys: message.patchRecentMessageKeys,
    greetingDateKey: message.patchGreetingDateKey,
    greetingMessageKey: message.patchGreetingMessageKey,
    celebratedCalorieDateKey: message.patchCelebratedCalorieDateKey,
    celebratedWaterDateKey: message.patchCelebratedWaterDateKey,
  };
}

/** True when persisting the patch would change stored dashboard state. */
export function dashboardStateNeedsPersist(
  existing: MemberPortalDashboardStateDoc | null | undefined,
  patch: DashboardStatePatch,
): boolean {
  if (!existing) {
    return (
      (patch.recentMessageKeys?.length ?? 0) > 0 ||
      patch.greetingDateKey != null ||
      patch.greetingMessageKey != null ||
      patch.celebratedCalorieDateKey != null ||
      patch.celebratedWaterDateKey != null
    );
  }

  if (
    patch.recentMessageKeys &&
    !arraysEqual(patch.recentMessageKeys, existing.recentMessageKeys ?? [])
  ) {
    return true;
  }
  if (
    patch.greetingDateKey !== undefined &&
    patch.greetingDateKey !== (existing.greetingDateKey ?? null)
  ) {
    return true;
  }
  if (
    patch.greetingMessageKey !== undefined &&
    patch.greetingMessageKey !== (existing.greetingMessageKey ?? null)
  ) {
    return true;
  }
  if (
    patch.celebratedCalorieDateKey !== undefined &&
    patch.celebratedCalorieDateKey !==
      (existing.celebratedCalorieDateKey ?? null)
  ) {
    return true;
  }
  if (
    patch.celebratedWaterDateKey !== undefined &&
    patch.celebratedWaterDateKey !== (existing.celebratedWaterDateKey ?? null)
  ) {
    return true;
  }

  return false;
}
