import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("member portal navigation performance guards", () => {
  it("does not flash a full-page skeleton during portal segment loading", () => {
    const source = readFileSync(
      resolve("src/app/member/(portal)/loading.tsx"),
      "utf8",
    );
    expect(source).toContain("return null");
    expect(source).not.toContain("animate-pulse");
  });

  it("syncs workout tabs without router.replace on the workout page client", () => {
    const source = readFileSync(
      resolve(
        "src/components/member-portal/workout/member-workout-page-client.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("syncMemberWorkoutPageUrl");
    expect(source).not.toMatch(/navigateTopTab[\s\S]*router\.replace/);
    expect(source).toContain('addEventListener("popstate"');
  });

  it("keeps exercise library mounted while switching workout tabs", () => {
    const source = readFileSync(
      resolve(
        "src/components/member-portal/workout/member-workout-page-client.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("MemberExerciseLibraryPanel");
    expect(source).toMatch(/hidden=\{tab !== "exercises"\}/);
    expect(source).not.toMatch(/\{tab === "exercises" \? \(\s*\n\s*<MemberExerciseLibraryPanel/);
  });

  it("avoids redundant router.refresh after overview workout start navigation", () => {
    const source = readFileSync(
      resolve("src/components/member-portal/todays-workout-start-button.tsx"),
      "utf8",
    );
    expect(source).toContain('router.push("/member/workout")');
    expect(source).not.toContain("router.refresh()");
  });

  it("parallelizes overview and suggested-day fetches on the member home page", () => {
    const source = readFileSync(
      resolve("src/app/member/(portal)/page.tsx"),
      "utf8",
    );
    expect(source).toMatch(
      /Promise\.all\(\[[\s\S]*getSuggestedWorkoutDay[\s\S]*getMemberPortalOverview/,
    );
  });
});
