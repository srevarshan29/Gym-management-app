import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { MEMBER_PORTAL_NAV_PENDING_TIMEOUT_MS } from "@/components/member-portal/member-portal-nav";
import { shouldUseProgrammaticNavigation } from "@/hooks/use-navigation-lock";

describe("member portal bottom nav pending UX", () => {
  it("defers to native Link navigation for tab clicks (no global lock)", () => {
    expect(shouldUseProgrammaticNavigation(true, false, undefined)).toBe(false);
  });

  it("sets local pending state before native navigation completes", () => {
    const source = readFileSync(
      resolve("src/components/member-portal/member-portal-nav.tsx"),
      "utf8",
    );
    expect(source).toContain("setPendingTabMatch(tab.match)");
    expect(source).toContain("data-nav-pending");
    expect(source).toContain("memberPortalTabPendingShouldClear");
    expect(source).toContain("MEMBER_PORTAL_NAV_PENDING_TIMEOUT_MS");
    expect(MEMBER_PORTAL_NAV_PENDING_TIMEOUT_MS).toBe(10_000);
  });

  it("uses lightweight route loading feedback instead of a null or skeleton fallback", () => {
    const source = readFileSync(
      resolve("src/app/member/(portal)/loading.tsx"),
      "utf8",
    );
    expect(source).not.toContain("return null");
    expect(source).not.toMatch(/h-28 rounded-2xl bg-muted/);
    expect(source).toContain("animate-member-portal-route-loading");
    expect(source).toContain("pointer-events-none");
  });
});
