import { afterEach, describe, expect, it, vi } from "vitest";

import {
  memberWorkoutPageHref,
  readMemberWorkoutPageQueryFromLocation,
  syncMemberWorkoutPageUrl,
} from "@/lib/member-portal/member-workout-tab-url";

describe("syncMemberWorkoutPageUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates workout tab query via history.replaceState without navigation", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        href: "https://app.example/member/workout?tab=assigned",
        pathname: "/member/workout",
        search: "?tab=assigned",
      },
      history: { state: { idx: 0 }, replaceState },
    });

    syncMemberWorkoutPageUrl({ tab: "library", group: "CHEST" });

    expect(replaceState).toHaveBeenCalledWith(
      { idx: 0 },
      "",
      "/member/workout?tab=library&group=CHEST",
    );
  });

  it("reads tab state from window.location after a sync", () => {
    vi.stubGlobal("window", {
      location: {
        pathname: "/member/workout",
        search: "?tab=library&group=LEGS",
      },
    });

    const query = readMemberWorkoutPageQueryFromLocation();
    expect(query.topTab).toBe("exercises");
    expect(query.group).toBe("LEGS");
    expect(memberWorkoutPageHref({ tab: "library", group: "LEGS" })).toBe(
      "/member/workout?tab=library&group=LEGS",
    );
  });
});
