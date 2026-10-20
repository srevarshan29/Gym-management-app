import { describe, expect, it } from "vitest";

import { isMemberPortalTabActive } from "@/lib/member-portal/member-portal-tab-match";

describe("isMemberPortalTabActive", () => {
  it("maps overview and nested routes to bottom-nav tabs", () => {
    expect(isMemberPortalTabActive("/member", "overview")).toBe(true);
    expect(isMemberPortalTabActive("/member/workout", "workout")).toBe(true);
    expect(isMemberPortalTabActive("/member/workout/progress", "workout")).toBe(
      true,
    );
    expect(isMemberPortalTabActive("/member/nutrition", "tools")).toBe(true);
    expect(isMemberPortalTabActive("/member/profile", "profile")).toBe(true);
    expect(isMemberPortalTabActive("/member/workout", "overview")).toBe(false);
  });
});
