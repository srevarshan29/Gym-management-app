import { afterEach, describe, expect, it, vi } from "vitest";

import { syncMemberNutritionDateUrl } from "@/lib/nutrition/nutrition-date-url";

describe("syncMemberNutritionDateUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates ?date= via history.replaceState without navigation", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        href: "https://app.example/member/nutrition?date=2026-01-01",
        pathname: "/member/nutrition",
        search: "?date=2026-01-01",
      },
      history: { state: { idx: 0 }, replaceState },
    });

    syncMemberNutritionDateUrl("2026-01-15");

    expect(replaceState).toHaveBeenCalledWith(
      { idx: 0 },
      "",
      "/member/nutrition?date=2026-01-15",
    );
  });
});
