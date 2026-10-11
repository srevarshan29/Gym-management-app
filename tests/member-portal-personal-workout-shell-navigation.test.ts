import { describe, expect, it, vi } from "vitest";

import { prepareMemberSignOutLeave } from "@/lib/member-portal/member-sign-out-before-leave";
import { isPersonalWorkoutEditorRoute } from "@/lib/member-portal/personal-workout-editor-route";
import { runBeforeNavigateIfRegistered } from "@/hooks/use-navigation-lock";
import {
  flushBeforePersonalWorkoutNavigation,
  PersonalWorkoutAutosaveRunner,
} from "@/lib/member-portal/personal-workout-editor-autosave";

describe("isPersonalWorkoutEditorRoute", () => {
  it("matches only the personal workout editor page", () => {
    expect(isPersonalWorkoutEditorRoute("/member/workout/personal/w1")).toBe(
      true,
    );
    expect(
      isPersonalWorkoutEditorRoute("/member/workout/personal/w1/add-exercises"),
    ).toBe(false);
    expect(isPersonalWorkoutEditorRoute("/member/workout")).toBe(false);
    expect(isPersonalWorkoutEditorRoute("/member/nutrition")).toBe(false);
  });
});

describe("runBeforeNavigateIfRegistered", () => {
  it("allows navigation when no handler is registered", async () => {
    await expect(runBeforeNavigateIfRegistered(null)).resolves.toBe(true);
  });

  it("blocks navigation when handler returns false", async () => {
    const handler = vi.fn(async () => false);
    await expect(runBeforeNavigateIfRegistered(handler)).resolves.toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("shell navigation flush after immediate edit", () => {
  it("persists pending edits when leaving via registered flush", async () => {
    const save = vi.fn(
      async (_body: { name: string }) => ({ ok: true }),
    );
    const state = {
      workoutId: "w1",
      name: "After shell tap",
      exercises: [] as [],
    };
    const runner = new PersonalWorkoutAutosaveRunner({
      getState: () => state,
      save,
      onStatusChange: () => {},
    });
    runner.enableAfterHydration();
    runner.markDirty();

    const inFlight = { current: null as Promise<boolean> | null };
    const ok = await flushBeforePersonalWorkoutNavigation(runner, inFlight);
    expect(ok).toBe(true);
    expect(save).toHaveBeenCalled();
    expect(save.mock.calls[0]![0].name).toBe("After shell tap");
  });

  it("blocks shell navigation when save fails during flush", async () => {
    const save = vi.fn(async () => ({ ok: false }));
    const runner = new PersonalWorkoutAutosaveRunner({
      getState: () => ({
        workoutId: "w1",
        name: "X",
        exercises: [],
      }),
      save,
      onStatusChange: () => {},
    });
    runner.enableAfterHydration();
    runner.markDirty();

    const shellLeave = async () =>
      flushBeforePersonalWorkoutNavigation(runner, {
        current: null,
      });

    await expect(runBeforeNavigateIfRegistered(shellLeave)).resolves.toBe(false);
  });
});

describe("prepareMemberSignOutLeave", () => {
  it("skips flush on non-editor routes", async () => {
    const runLeave = vi.fn(async () => false);
    await expect(
      prepareMemberSignOutLeave("/member/workout", runLeave),
    ).resolves.toBe(true);
    expect(runLeave).not.toHaveBeenCalled();
  });

  it("flushes on editor route before sign-out can proceed", async () => {
    const runLeave = vi.fn(async () => true);
    await expect(
      prepareMemberSignOutLeave("/member/workout/personal/w1", runLeave),
    ).resolves.toBe(true);
    expect(runLeave).toHaveBeenCalledTimes(1);
  });

  it("cancels sign-out when flush fails on editor route", async () => {
    const runLeave = vi.fn(async () => false);
    await expect(
      prepareMemberSignOutLeave("/member/workout/personal/w1", runLeave),
    ).resolves.toBe(false);
  });
});
