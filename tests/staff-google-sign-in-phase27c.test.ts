import { describe, expect, it } from "vitest";

import { parseGoogleEmailVerified } from "@/auth";
import {
  evaluateStaffGoogleSignIn,
  staffGoogleEmailMatchesAccount,
} from "@/lib/staff-auth/google-sign-in";
import { memberAuthConfig } from "@/member-auth.config";

const gymStaff = {
  id: "u-staff",
  name: "Staff",
  email: "staff@gym.test",
  role: "STAFF" as const,
  gymId: "gym-1",
  credentialsVersion: 0,
};

const superAdmin = {
  id: "u-super",
  name: "Super",
  email: "super@platform.test",
  role: "SUPER_ADMIN" as const,
  gymId: null,
  credentialsVersion: 0,
};

describe("Phase 27C — Super Admin Google sign-in", () => {
  it("authorizes existing SUPER_ADMIN with verified matching email", () => {
    const result = evaluateStaffGoogleSignIn({
      emailVerified: true,
      googleEmail: "super@platform.test",
      user: superAdmin,
      gym: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.role).toBe("SUPER_ADMIN");
      expect(result.user.gymId).toBeNull();
    }
  });

  it("keeps OWNER, ADMIN and STAFF Google login functional", () => {
    for (const role of ["OWNER", "ADMIN", "STAFF"] as const) {
      const result = evaluateStaffGoogleSignIn({
        emailVerified: true,
        googleEmail: gymStaff.email,
        user: { ...gymStaff, role },
        gym: { status: "active" },
      });
      expect(result.ok).toBe(true);
    }
  });

  it("rejects unknown Google email (no Firestore user)", () => {
    const result = evaluateStaffGoogleSignIn({
      emailVerified: true,
      googleEmail: "unknown@gmail.com",
      user: null,
      gym: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("user_not_found");
  });

  it("parseGoogleEmailVerified requires explicit true", () => {
    expect(parseGoogleEmailVerified({ email_verified: true })).toBe(true);
    expect(parseGoogleEmailVerified({ email_verified: false })).toBe(false);
    expect(parseGoogleEmailVerified({})).toBe(false);
    expect(parseGoogleEmailVerified(undefined)).toBe(false);
    expect(parseGoogleEmailVerified(null)).toBe(false);
    expect(parseGoogleEmailVerified({ email_verified: null })).toBe(false);
  });

  it("rejects Google sign-in when email_verified claim is missing", () => {
    const result = evaluateStaffGoogleSignIn({
      emailVerified: parseGoogleEmailVerified({}),
      googleEmail: superAdmin.email,
      user: superAdmin,
      gym: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unverified_email");
  });

  it("rejects unverified Google email", () => {
    const result = evaluateStaffGoogleSignIn({
      emailVerified: false,
      googleEmail: superAdmin.email,
      user: superAdmin,
      gym: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unverified_email");
  });

  it("rejects when Google email does not match stored account email", () => {
    const result = evaluateStaffGoogleSignIn({
      emailVerified: true,
      googleEmail: "other@gmail.com",
      user: superAdmin,
      gym: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("email_mismatch");
  });

  it("rejects gym staff without gym context", () => {
    const result = evaluateStaffGoogleSignIn({
      emailVerified: true,
      googleEmail: gymStaff.email,
      user: gymStaff,
      gym: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("gym_not_found");
  });

  it("does not grant SUPER_ADMIN when stored role is OWNER", () => {
    const result = evaluateStaffGoogleSignIn({
      emailVerified: true,
      googleEmail: "owner@gym.test",
      user: {
        ...gymStaff,
        email: "owner@gym.test",
        role: "OWNER",
      },
      gym: { status: "active" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.role).toBe("OWNER");
  });

  it("matches emails case-insensitively after normalization", () => {
    expect(staffGoogleEmailMatchesAccount("Super@Platform.test", "super@platform.test")).toBe(
      true,
    );
  });

  it("leaves member authentication configuration unchanged", () => {
    expect(memberAuthConfig.basePath).toBe("/api/member-auth");
    expect(memberAuthConfig.pages?.signIn).toBe("/member/login");
    expect(memberAuthConfig.providers).toEqual([]);
  });
});