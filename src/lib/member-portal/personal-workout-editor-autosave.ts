import { DEFAULT_PERSONAL_WORKOUT_NAME } from "@/lib/workout-tracking/member-personal-workout-constants";

export const PERSONAL_WORKOUT_AUTOSAVE_DEBOUNCE_MS = 500;

export type PersonalWorkoutEditorExerciseRow = {
  id: string;
  catalogId: string;
  sortOrder: number;
  targetSets: number;
  targetReps: string;
};

export type PersonalWorkoutAutosaveStatus =
  | "idle"
  | "pending"
  | "saving"
  | "saved"
  | "error";

export type PersonalWorkoutSaveBody = {
  workoutId: string;
  name: string;
  exercises: {
    id: string;
    catalogId: string;
    sortOrder: number;
    targetSets: number;
    targetReps: string;
  }[];
};

export function buildPersonalWorkoutSaveBody(
  workoutId: string,
  name: string,
  exercises: PersonalWorkoutEditorExerciseRow[],
): PersonalWorkoutSaveBody {
  return {
    workoutId,
    name: name.trim() || DEFAULT_PERSONAL_WORKOUT_NAME,
    exercises: exercises.map((e) => ({
      id: e.id,
      catalogId: e.catalogId,
      sortOrder: e.sortOrder,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
    })),
  };
}

export function isStaleAutosaveRevision(
  savedRevision: number,
  latestRevision: number,
): boolean {
  return savedRevision < latestRevision;
}

export type DebounceTimers = {
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
};

export type DebouncedAutosaveScheduler = {
  schedule: (callback: () => void) => void;
  cancel: () => void;
  flushPending: () => void;
};

export function createDebouncedAutosaveScheduler(
  debounceMs: number,
  timers: DebounceTimers = {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  },
): DebouncedAutosaveScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: (() => void) | null = null;

  return {
    schedule(callback) {
      pending = callback;
      if (timer !== null) timers.clearTimeout(timer);
      timer = timers.setTimeout(() => {
        timer = null;
        const fn = pending;
        pending = null;
        fn?.();
      }, debounceMs);
    },
    cancel() {
      if (timer !== null) timers.clearTimeout(timer);
      timer = null;
      pending = null;
    },
    flushPending() {
      if (timer !== null) timers.clearTimeout(timer);
      timer = null;
      const fn = pending;
      pending = null;
      fn?.();
    },
  };
}

export type PersonalWorkoutAutosaveRunnerOptions = {
  debounceMs?: number;
  getState: () => {
    workoutId: string;
    name: string;
    exercises: PersonalWorkoutEditorExerciseRow[];
  };
  save: (body: PersonalWorkoutSaveBody) => Promise<{ ok: boolean }>;
  onStatusChange: (status: PersonalWorkoutAutosaveStatus) => void;
  scheduler?: DebouncedAutosaveScheduler;
};

export class PersonalWorkoutAutosaveRunner {
  private revision = 0;
  private scheduler: DebouncedAutosaveScheduler;
  private debounceMs: number;
  private getState: PersonalWorkoutAutosaveRunnerOptions["getState"];
  private save: PersonalWorkoutAutosaveRunnerOptions["save"];
  private onStatusChange: PersonalWorkoutAutosaveRunnerOptions["onStatusChange"];
  private chain: Promise<void> = Promise.resolve();
  private flushInFlight: Promise<boolean> | null = null;
  private enabled = false;

  status: PersonalWorkoutAutosaveStatus = "idle";

  constructor(options: PersonalWorkoutAutosaveRunnerOptions) {
    this.debounceMs = options.debounceMs ?? PERSONAL_WORKOUT_AUTOSAVE_DEBOUNCE_MS;
    this.getState = options.getState;
    this.save = options.save;
    this.onStatusChange = options.onStatusChange;
    this.scheduler =
      options.scheduler ??
      createDebouncedAutosaveScheduler(this.debounceMs);
  }

  private setStatus(next: PersonalWorkoutAutosaveStatus) {
    this.status = next;
    this.onStatusChange(next);
  }

  /** Call after initial server load; does not schedule a save. */
  enableAfterHydration() {
    this.enabled = true;
    this.setStatus("idle");
  }

  disable() {
    this.enabled = false;
    this.scheduler.cancel();
  }

  markDirty() {
    if (!this.enabled) return;
    this.revision += 1;
    this.setStatus("pending");
    this.scheduler.schedule(() => {
      this.enqueuePersist();
    });
  }

  retry() {
    if (!this.enabled) return;
    this.revision += 1;
    this.scheduler.cancel();
    this.enqueuePersist();
  }

  /** Cancel debounce and persist until revision is caught up. */
  async flushNow(): Promise<boolean> {
    if (!this.enabled) return true;
    if (this.flushInFlight) return this.flushInFlight;
    this.flushInFlight = this.runFlushNow();
    try {
      return await this.flushInFlight;
    } finally {
      this.flushInFlight = null;
    }
  }

  private async runFlushNow(): Promise<boolean> {
    this.scheduler.flushPending();
    this.scheduler.cancel();
    this.revision += 1;
    await this.enqueuePersistAndWait();
    return this.status !== "error";
  }

  private enqueuePersist() {
    this.chain = this.chain.then(() => this.persistUntilCurrent());
  }

  private enqueuePersistAndWait(): Promise<void> {
    const next = this.chain.then(() => this.persistUntilCurrent());
    this.chain = next;
    return next;
  }

  private async persistUntilCurrent(): Promise<void> {
    while (this.enabled) {
      const revisionAtStart = this.revision;
      const body = buildPersonalWorkoutSaveBody(
        this.getState().workoutId,
        this.getState().name,
        this.getState().exercises,
      );
      this.setStatus("saving");
      const result = await this.save(body);
      if (isStaleAutosaveRevision(revisionAtStart, this.revision)) {
        continue;
      }
      if (!result.ok) {
        this.setStatus("error");
        return;
      }
      this.setStatus("saved");
      return;
    }
  }
}

/** Coalesce concurrent navigation flushes (e.g. double-click Back). */
export async function flushBeforePersonalWorkoutNavigation(
  runner: PersonalWorkoutAutosaveRunner | null | undefined,
  inFlight: { current: Promise<boolean> | null },
): Promise<boolean> {
  if (inFlight.current) return inFlight.current;
  const promise = runner?.flushNow() ?? Promise.resolve(true);
  inFlight.current = promise;
  try {
    return await promise;
  } finally {
    inFlight.current = null;
  }
}
