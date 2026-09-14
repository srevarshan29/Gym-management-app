export type RestTimerSnapshot = {
  phase: "running" | "complete";
  activeDuration: number;
  /** Unix ms when the running countdown ends. Null when complete. */
  endAt: number | null;
};

const STORAGE_PREFIX = "workout-rest-timer";

export function restTimerStorageKey(
  sessionId: string,
  exerciseId: string,
): string {
  return `${STORAGE_PREFIX}:${sessionId}:${exerciseId}`;
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readRestTimerSnapshot(
  sessionId: string,
  exerciseId: string,
): RestTimerSnapshot | null {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(
      restTimerStorageKey(sessionId, exerciseId),
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as RestTimerSnapshot;
    if (
      (parsed.phase !== "running" && parsed.phase !== "complete") ||
      typeof parsed.activeDuration !== "number" ||
      (parsed.endAt != null && typeof parsed.endAt !== "number")
    ) {
      return null;
    }

    if (parsed.phase === "running") {
      if (parsed.endAt == null) return null;
      if (parsed.endAt <= Date.now()) {
        return {
          phase: "complete",
          activeDuration: parsed.activeDuration,
          endAt: null,
        };
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeRestTimerSnapshot(
  sessionId: string,
  exerciseId: string,
  snapshot: RestTimerSnapshot,
): void {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(
      restTimerStorageKey(sessionId, exerciseId),
      JSON.stringify(snapshot),
    );
  } catch {
    // Ignore quota / private browsing errors.
  }
}

export function clearRestTimerSnapshot(
  sessionId: string,
  exerciseId: string,
): void {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(restTimerStorageKey(sessionId, exerciseId));
  } catch {
    // Ignore storage errors.
  }
}

export function clearRestTimersForSession(sessionId: string): void {
  if (!canUseSessionStorage()) return;

  const prefix = `${STORAGE_PREFIX}:${sessionId}:`;

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors.
  }
}
