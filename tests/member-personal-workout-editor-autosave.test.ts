import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildPersonalWorkoutSaveBody,
  createDebouncedAutosaveScheduler,
  type DebounceTimers,
  flushBeforePersonalWorkoutNavigation,
  isStaleAutosaveRevision,
  PersonalWorkoutAutosaveRunner,
  PERSONAL_WORKOUT_AUTOSAVE_DEBOUNCE_MS,
} from "@/lib/member-portal/personal-workout-editor-autosave";
import { DEFAULT_PERSONAL_WORKOUT_NAME } from "@/lib/workout-tracking/member-personal-workouts";

describe("buildPersonalWorkoutSaveBody", () => {
  it("uses default workout name when name is blank", () => {
    const body = buildPersonalWorkoutSaveBody("w1", "   ", []);
    expect(body.name).toBe(DEFAULT_PERSONAL_WORKOUT_NAME);
  });
});

describe("isStaleAutosaveRevision", () => {
  it("detects stale saves", () => {
    expect(isStaleAutosaveRevision(1, 2)).toBe(true);
    expect(isStaleAutosaveRevision(2, 2)).toBe(false);
  });
});

describe("createDebouncedAutosaveScheduler", () => {
  it("debounces callbacks until flush", () => {
    const timeouts: Array<() => void> = [];
    const timers: DebounceTimers = {
      setTimeout: (fn) => {
        timeouts.push(fn);
        return timeouts.length as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: vi.fn(),
    };
    const scheduler = createDebouncedAutosaveScheduler(500, timers);
    const cb = vi.fn();
    scheduler.schedule(cb);
    scheduler.schedule(cb);
    expect(timeouts).toHaveLength(2);
    expect(cb).not.toHaveBeenCalled();
    scheduler.flushPending();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("PersonalWorkoutAutosaveRunner", () => {
  let save: ReturnType<typeof vi.fn>;
  let statuses: string[];
  let state: {
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

  beforeEach(() => {
    statuses = [];
    state = {
      workoutId: "w1",
      name: "Push",
      exercises: [],
    };
    save = vi.fn(async () => ({ ok: true }));
  });

  function createRunner(scheduler?: ReturnType<typeof createDebouncedAutosaveScheduler>) {
    return new PersonalWorkoutAutosaveRunner({
      getState: () => state,
      save,
      onStatusChange: (s) => statuses.push(s),
      scheduler,
    });
  }

  it("does not save before hydration is enabled", async () => {
    const runner = createRunner();
    runner.markDirty();
    await new Promise((r) => setTimeout(r, 0));
    expect(save).not.toHaveBeenCalled();
  });

  it("debounces saves after markDirty", async () => {
    const pending: Array<() => void> = [];
    const timers: DebounceTimers = {
      setTimeout: (fn) => {
        pending.push(fn);
        return pending.length as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: vi.fn(),
    };
    const scheduler = createDebouncedAutosaveScheduler(
      PERSONAL_WORKOUT_AUTOSAVE_DEBOUNCE_MS,
      timers,
    );
    const runner = createRunner(scheduler);
    runner.enableAfterHydration();
    runner.markDirty();
    expect(save).not.toHaveBeenCalled();
    pending[0]?.();
    await runner.flushNow();
    expect(save).toHaveBeenCalled();
    expect(statuses).toContain("saved");
  });

  it("persists latest edits when a slower save would be stale", async () => {
    const runner = createRunner();
    runner.enableAfterHydration();
    save
      .mockImplementationOnce(async () => {
        state.name = "Latest";
        runner.markDirty();
        await new Promise((r) => setTimeout(r, 5));
        return { ok: true };
      })
      .mockResolvedValue({ ok: true });

    runner.markDirty();
    await runner.flushNow();

    expect(save.mock.calls.length).toBeGreaterThanOrEqual(2);
    const lastBody = save.mock.calls.at(-1)?.[0] as { name: string };
    expect(lastBody.name).toBe("Latest");
  });

  it("enters error state and retry can recover", async () => {
    const runner = createRunner();
    runner.enableAfterHydration();
    save.mockResolvedValueOnce({ ok: false });
    runner.markDirty();
    await runner.flushNow();
    expect(statuses).toContain("error");

    save.mockResolvedValueOnce({ ok: true });
    runner.retry();
    await runner.flushNow();
    expect(statuses).toContain("saved");
  });

  it("flushNow persists edits immediately without waiting for debounce", async () => {
    const pending: Array<() => void> = [];
    const timers: DebounceTimers = {
      setTimeout: (fn) => {
        pending.push(fn);
        return pending.length as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: vi.fn(),
    };
    const scheduler = createDebouncedAutosaveScheduler(500, timers);
    const runner = createRunner(scheduler);
    runner.enableAfterHydration();
    state.name = "Immediate save";
    runner.markDirty();
    expect(save).not.toHaveBeenCalled();
    const ok = await runner.flushNow();
    expect(ok).toBe(true);
    expect(save).toHaveBeenCalled();
    expect((save.mock.calls[0]?.[0] as { name: string }).name).toBe(
      "Immediate save",
    );
  });

  it("flushNow waits for in-flight serialized saves before navigation", async () => {
    const runner = createRunner();
    runner.enableAfterHydration();
    let resolveFirst: (() => void) | undefined;
    save
      .mockImplementationOnce(
        () =>
          new Promise<{ ok: boolean }>((resolve) => {
            resolveFirst = () => resolve({ ok: true });
          }),
      )
      .mockResolvedValue({ ok: true });

    runner.markDirty();
    const flushPromise = runner.flushNow();
    await new Promise((r) => setTimeout(r, 0));
    resolveFirst?.();
    const ok = await flushPromise;
    expect(ok).toBe(true);
    expect(save).toHaveBeenCalled();
  });
});

describe("flushBeforePersonalWorkoutNavigation", () => {
  let save: ReturnType<typeof vi.fn>;
  let state: { workoutId: string; name: string; exercises: [] };

  beforeEach(() => {
    state = { workoutId: "w1", name: "A", exercises: [] };
    save = vi.fn(async () => ({ ok: true }));
  });

  function createRunner() {
    return new PersonalWorkoutAutosaveRunner({
      getState: () => state,
      save,
      onStatusChange: () => {},
    });
  }

  it("blocks navigation when save fails during flush", async () => {
    const runner = createRunner();
    runner.enableAfterHydration();
    save.mockResolvedValue({ ok: false });
    runner.markDirty();
    const inFlight = { current: null as Promise<boolean> | null };
    const ok = await flushBeforePersonalWorkoutNavigation(runner, inFlight);
    expect(ok).toBe(false);
  });

  it("coalesces repeated navigation flush attempts", async () => {
    const runner = createRunner();
    runner.enableAfterHydration();
    state.name = "Navigate";
    runner.markDirty();
    const inFlight = { current: null as Promise<boolean> | null };
    const first = flushBeforePersonalWorkoutNavigation(runner, inFlight);
    const second = flushBeforePersonalWorkoutNavigation(runner, inFlight);
    const [ok1, ok2] = await Promise.all([first, second]);
    expect(ok1).toBe(true);
    expect(ok2).toBe(true);
    expect(save.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
