import { describe, expect, it } from "vitest";

import { countLoggedSetsInSession } from "@/lib/workout-tracking/session-logged-sets";

describe("countLoggedSetsInSession", () => {
  it("counts embedded set logs", () => {
    expect(
      countLoggedSetsInSession({
        exercises: [
          { sets: [{ setNumber: 1, weightKg: 10, durationSeconds: null }] },
          { sets: [{ setNumber: 1, weightKg: null, durationSeconds: 30 }] },
        ],
      } as never),
    ).toBe(2);
  });

  it("returns zero for empty session", () => {
    expect(countLoggedSetsInSession({ exercises: [] } as never)).toBe(0);
  });
});
