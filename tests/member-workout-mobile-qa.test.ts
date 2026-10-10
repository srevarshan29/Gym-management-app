import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("member workout mobile QA layout guards", () => {
  it("offsets exercise detail action bar above bottom navigation", () => {
    const source = readFileSync(
      resolve("src/components/member-portal/workout/member-exercise-detail.tsx"),
      "utf8",
    );
    expect(source).toContain("bottom-[calc(4.25rem+env(safe-area-inset-bottom");
    expect(source).toContain("z-30");
    expect(source).toMatch(/pb-\[calc\(11\.5rem\+4\.25rem/);
  });

  it("renders six muscle groups from local static art", () => {
    const grid = readFileSync(
      resolve("src/components/member-portal/workout/member-muscle-group-grid.tsx"),
      "utf8",
    );
    expect(grid).toContain("MemberMuscleGroupArt");
    expect(grid).toContain("grid-cols-2");
    expect(grid).toContain("lg:grid-cols-4");
    expect(grid).not.toContain("getMemberLibraryMuscleGroupCoversAction");
    const images = readFileSync(
      resolve("src/lib/member-portal/member-muscle-group-images.ts"),
      "utf8",
    );
    expect(images).toContain("/images/muscle-groups/chest.png");
    const groups = readFileSync(
      resolve("src/lib/member-portal/member-library-muscle-groups.ts"),
      "utf8",
    );
    expect(groups).toContain('"FULL_BODY"');
    expect(groups).toContain('"CHEST"');
  });

  it("keeps portal shell padding clear of fixed bottom nav", () => {
    const shell = readFileSync(
      resolve("src/components/member-portal/member-portal-shell.tsx"),
      "utf8",
    );
    expect(shell).toContain("pb-[max(6rem");
  });
});
