import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("member workout start flow from overview", () => {
  it("prefetches the workout route and navigates without router.refresh after start", () => {
    const source = readFileSync(
      resolve("src/components/member-portal/todays-workout-start-button.tsx"),
      "utf8",
    );
    expect(source).toContain('router.prefetch("/member/workout")');
    expect(source).toContain('router.push("/member/workout")');
    expect(source).not.toContain("router.refresh()");
  });

  it("revalidates only the workout page after starting a session", () => {
    const source = readFileSync(
      resolve("src/app/actions/workout-sessions.ts"),
      "utf8",
    );
    const startBlock = source.slice(
      source.indexOf("export async function startWorkoutSession"),
      source.indexOf("export async function logWorkoutSet"),
    );
    expect(startBlock).toContain('revalidatePath("/member/workout")');
    expect(startBlock).not.toContain('revalidatePath("/member")');
  });

  it("loads a slimmer workout page payload when an active session exists", () => {
    const source = readFileSync(
      resolve("src/lib/workout-tracking/member-workout-page.ts"),
      "utf8",
    );
    expect(source).toMatch(/if \(activeRaw\) \{[\s\S]*collectLibraryExerciseIdsFromSessionExercises/);
    expect(source).toMatch(/else if \(planDoc\)/);
    expect(source).toMatch(/!activeRaw && planDoc[\s\S]*buildMemberWorkoutPlanDetail/);
  });
});
