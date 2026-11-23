import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("staff login throttle", () => {
  it("does not run legacy credentials throttling on the retired password login path", () => {
    const authActionSource = readFileSync(
      resolve("src/app/actions/auth.ts"),
      "utf8",
    );
    const authSource = readFileSync(resolve("src/auth.ts"), "utf8");

    expect(authActionSource).not.toContain("checkStaffLoginThrottle");
    expect(authActionSource).not.toContain('signIn("credentials"');
    expect(authSource).not.toContain('from "next-auth/providers/credentials"');
    expect(authSource).not.toContain("recordStaffLoginFailure");
    expect(authSource).toContain('account?.provider !== "google"');
  });
});