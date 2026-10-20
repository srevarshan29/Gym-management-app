import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("member portal bottom nav", () => {
  it("uses native Link navigation without navigate() on tab clicks", () => {
    const source = readFileSync(
      resolve("src/components/member-portal/member-portal-nav.tsx"),
      "utf8",
    );
    expect(source).not.toContain("useSharedNavigationLock");
    expect(source).not.toContain("navigate(");
    expect(source).not.toContain("Loader2");
    expect(source).not.toContain("pendingTabMatch");
  });

  it("uses pathname-only navigation lock in the member shell", () => {
    const source = readFileSync(
      resolve("src/components/member-portal/member-portal-shell.tsx"),
      "utf8",
    );
    expect(source).toContain("PathnameNavigationLockProvider");
    expect(source).not.toMatch(/<NavigationLockProvider[\s>]/);
  });

  it("restores segment loading placeholder during route transitions", () => {
    const source = readFileSync(
      resolve("src/app/member/(portal)/loading.tsx"),
      "utf8",
    );
    expect(source).toContain("animate-pulse");
    expect(source).not.toContain("animate-member-portal-route-loading");
    expect(source).not.toContain("return null");
  });
});
