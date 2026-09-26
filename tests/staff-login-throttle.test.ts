import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("staff login throttle", () => {
  it("checks throttle once in the login action, not again in credentials authorize", () => {
    const authActionSource = readFileSync(
      resolve("src/app/actions/auth.ts"),
      "utf8",
    );
    const authSource = readFileSync(resolve("src/auth.ts"), "utf8");

    expect(authActionSource).toContain("checkStaffLoginThrottle");
    expect(authSource).not.toContain("checkStaffLoginThrottle");
    expect(authSource).toContain("recordStaffLoginFailure");
    expect(authSource).toContain("clearStaffLoginFailures");
  });
});
