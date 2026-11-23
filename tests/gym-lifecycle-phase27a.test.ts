import { describe, expect, it, vi } from "vitest";

import {
  validateGymDeactivateTransition,
  validateGymReactivateTransition,
} from "@/lib/gym-lifecycle/admin-transitions";
import {
  gymAllowsTenantAccess,
  resolveGymLifecycleStatus,
} from "@/lib/gym-lifecycle/status";
import { evaluateStaffGoogleSignIn } from "@/lib/staff-auth/google-sign-in";
import { staffAccountHasPassword } from "@/lib/staff-auth/password-auth";
import {
  credentialsPasswordLoginAllowed,
  staffGoogleSignInRoleAllowed,
  staffPasswordResetRoleAllowed,
} from "@/lib/staff-auth/staff-roles";

describe("gym lifecycle status", () => {
  it("treats legacy gyms without status as active", () => {
    expect(resolveGymLifecycleStatus({})).toBe("active");
    expect(resolveGymLifecycleStatus({ status: undefined })).toBe("active");
    expect(gymAllowsTenantAccess({})).toBe(true);
  });

  it("blocks access for deactivated gyms", () => {
    expect(resolveGymLifecycleStatus({ status: "deactivated" })).toBe(
      "deactivated",
    );
    expect(gymAllowsTenantAccess({ status: "deactivated" })).toBe(false);
  });
});

describe("gym lifecycle admin transitions", () => {
  it("allows deactivation only from active", () => {
    const ok = validateGymDeactivateTransition({ status: "active" }, "g1");
    expect(ok.ok).toBe(true);
    const dup = validateGymDeactivateTransition(
      { status: "deactivated" },
      "g1",
    );
    expect(dup.ok).toBe(false);
  });

  it("allows reactivation only from deactivated without deletion lock", () => {
    const ok = validateGymReactivateTransition(
      { status: "deactivated" },
      "g1",
    );
    expect(ok.ok).toBe(true);
    const dup = validateGymReactivateTransition({ status: "active" }, "g1");
    expect(dup.ok).toBe(false);
    const locked = validateGymReactivateTransition(
      {
        status: "deactivated",
        deletionMode: "immediate",
        deletionLockedAt: null,
        purgeStatus: "backup_pending",
      },
      "g1",
    );
    expect(locked.ok).toBe(false);
  });
});

describe("staff google sign-in policy", () => {
  const baseUser = {
    id: "u1",
    name: "Staff",
    email: "person@test.com",
    gymId: "g1",
    credentialsVersion: 0,
  };

  it("allows OWNER, ADMIN and STAFF on active gyms", () => {
    for (const role of ["OWNER", "ADMIN", "STAFF"] as const) {
      const result = evaluateStaffGoogleSignIn({
        emailVerified: true,
        googleEmail: baseUser.email,
        user: { ...baseUser, role },
        gym: { status: "active" },
      });
      expect(result.ok).toBe(true);
    }
  });

  it("allows SUPER_ADMIN with matching verified email", () => {
    const result = evaluateStaffGoogleSignIn({
      emailVerified: true,
      googleEmail: "super@test.com",
      user: {
        ...baseUser,
        email: "super@test.com",
        role: "SUPER_ADMIN",
        gymId: null,
      },
      gym: null,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects unverified email and deactivated gyms", () => {
    const unverified = evaluateStaffGoogleSignIn({
      emailVerified: false,
      googleEmail: baseUser.email,
      user: { ...baseUser, role: "STAFF" },
      gym: { status: "active" },
    });
    expect(unverified.ok).toBe(false);

    const inactive = evaluateStaffGoogleSignIn({
      emailVerified: true,
      googleEmail: baseUser.email,
      user: { ...baseUser, role: "STAFF" },
      gym: { status: "deactivated" },
    });
    expect(inactive.ok).toBe(false);
    if (!inactive.ok) expect(inactive.reason).toBe("gym_inactive");
  });
});

describe("staff role auth policy", () => {
  it("disallows password credentials for every staff role", () => {
    expect(credentialsPasswordLoginAllowed("SUPER_ADMIN")).toBe(false);
    expect(credentialsPasswordLoginAllowed("OWNER")).toBe(false);
    expect(credentialsPasswordLoginAllowed("ADMIN")).toBe(false);
    expect(credentialsPasswordLoginAllowed("STAFF")).toBe(false);
  });

  it("allows staff Google for gym roles and SUPER_ADMIN", () => {
    expect(staffGoogleSignInRoleAllowed("OWNER")).toBe(true);
    expect(staffGoogleSignInRoleAllowed("ADMIN")).toBe(true);
    expect(staffGoogleSignInRoleAllowed("STAFF")).toBe(true);
    expect(staffGoogleSignInRoleAllowed("SUPER_ADMIN")).toBe(true);
  });

  it("disallows self-service password reset for all staff roles", () => {
    expect(staffPasswordResetRoleAllowed("SUPER_ADMIN")).toBe(false);
    expect(staffPasswordResetRoleAllowed("OWNER")).toBe(false);
    expect(staffPasswordResetRoleAllowed("ADMIN")).toBe(false);
    expect(staffPasswordResetRoleAllowed("STAFF")).toBe(false);
  });
});

describe("legacy password hashes on gym staff", () => {
  it("still detects stored password hashes without granting credential login by role", () => {
    expect(
      staffAccountHasPassword({ passwordHash: "$2a$10$legacy" }),
    ).toBe(true);
    expect(credentialsPasswordLoginAllowed("STAFF")).toBe(false);
  });
});

describe("password reset eligibility", () => {
  it("does not issue tokens for gym staff even with a legacy password hash", async () => {
    const { requestStaffPasswordReset } = await import(
      "@/lib/staff-auth/self-service-password-reset"
    );
    const createResetToken = vi.fn();

    const accounts = [
      {
        id: "u1",
        email: "staff@test.com",
        gymId: "g1",
        role: "STAFF" as const,
        passwordHash: "$2a$10$legacy",
      },
    ]
      .filter(
        (user) =>
          staffPasswordResetRoleAllowed(user.role) &&
          staffAccountHasPassword(user),
      )
      .map((user) => ({
        id: user.id,
        email: user.email,
        gymId: user.gymId,
      }));

    await requestStaffPasswordReset("staff@test.com", {
      findStaffAccountsByEmail: async () => accounts,
      consumeRequestAllowance: async () => ({ ok: true, remaining: 1 }),
      createResetToken,
      sendResetEmail: async () => ({ outcome: "skipped" }),
      resolveAppBaseUrl: () => "https://app.test",
    });

    expect(createResetToken).not.toHaveBeenCalled();
  });

  it("does not issue reset tokens for SUPER_ADMIN after Google-only migration", async () => {
    const { requestStaffPasswordReset } = await import(
      "@/lib/staff-auth/self-service-password-reset"
    );
    const createResetToken = vi.fn();

    const accounts = [
      {
        id: "sa1",
        email: "super@test.com",
        gymId: null,
        role: "SUPER_ADMIN" as const,
        passwordHash: "$2a$10$hash",
      },
    ]
      .filter(
        (user) =>
          staffPasswordResetRoleAllowed(user.role) &&
          staffAccountHasPassword(user),
      )
      .map((user) => ({
        id: user.id,
        email: user.email,
        gymId: user.gymId,
      }));

    await requestStaffPasswordReset("super@test.com", {
      findStaffAccountsByEmail: async () => accounts,
      consumeRequestAllowance: async () => ({ ok: true, remaining: 1 }),
      createResetToken,
      sendResetEmail: async () => ({ outcome: "sent" }),
      resolveAppBaseUrl: () => "https://app.test",
    });

    expect(createResetToken).not.toHaveBeenCalled();
  });
});