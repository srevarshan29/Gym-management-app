import { describe, expect, it } from "vitest";

import { MEMBER_TOOLS_MAIN } from "@/components/member-portal/tools/tools-nav";

describe("member tools hub", () => {
  it("lists main tools in the required order with Calorie Tracker fourth", () => {
    expect(MEMBER_TOOLS_MAIN.map((t) => t.title)).toEqual([
      "BMI Calculator",
      "Protein Calculator",
      "Calorie Calculator",
      "Calorie Tracker",
    ]);
    expect(MEMBER_TOOLS_MAIN[3]?.href).toBe("/member/nutrition");
    expect(MEMBER_TOOLS_MAIN[3]?.description).toBe(
      "Track food, calories and daily macros.",
    );
  });
});
