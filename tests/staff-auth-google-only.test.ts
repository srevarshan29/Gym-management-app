import { describe, expect, it } from "vitest";

import { authenticate } from "@/app/actions/auth";
import {
  evaluateStaffGoogleSignIn,
} from "@/lib/staff-auth/google-sign-in";
import { credentialsPasswordLoginAllowed } from "@/lib/staff-auth/staff-roles";

describe("staff auth — Google only", () => {
  it("rejects credential login policy for SUPER_ADMIN", () => {
    expect(credentialsPasswordLoginAllowed("SUPER_ADMIN")).toBe(false);
  });

  it("authenticate server action does not accept password sign-in", async () => {
    const form = new FormData();
    form.set("email", "super@platform.test");
    form.set("password", "secret");
    const message = await authenticate(undefined, form);
    expect(message).toMatch(/Google/i);
  });

  it("still authorizes SUPER_ADMIN via Google when email is verified", () => {
    const result = evaluateStaffGoogleSignIn({
      emailVerified: true,
      googleEmail: "super@platform.test",
      user: {
        id: "u-super",
        name: "Super",
        email: "super@platform.test",
        role: "SUPER_ADMIN",
        gymId: null,
        credentialsVersion: 0,
      },
      gym: null,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects SUPER_ADMIN Google sign-in without verified email", () => {
    const result = evaluateStaffGoogleSignIn({
      emailVerified: false,
      googleEmail: "super@platform.test",
      user: {
        id: "u-super",
        name: "Super",
        email: "super@platform.test",
        role: "SUPER_ADMIN",
        gymId: null,
      },
      gym: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unverified_email");
  });
});