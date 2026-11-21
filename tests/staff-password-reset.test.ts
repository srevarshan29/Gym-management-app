import { describe, expect, it } from "vitest";

import {
  StaffPasswordResetError,
  assertExactlyOneStaffAccount,
  assertStaffPasswordResetConfirmation,
  staffPasswordResetPatch,
  validateStaffResetPassword,
} from "@/lib/staff-auth/staff-password-reset";

const account = {
  id: "user-1",
  email: "ram@gmail.com",
  gymId: "gym-1",
  role: "STAFF",
};

describe("staff password reset guards", () => {
  it("requires exactly one matching account", () => {
    expect(assertExactlyOneStaffAccount([account])).toEqual(account);
    expect(() => assertExactlyOneStaffAccount([])).toThrow(
      /No staff account/,
    );
    expect(() => assertExactlyOneStaffAccount([account, account])).toThrow(
      StaffPasswordResetError,
    );
  });

  it("rejects short passwords and passwords over 72 bytes", () => {
    expect(validateStaffResetPassword("short")).toMatch(/8 characters/);
    expect(validateStaffResetPassword("a".repeat(8))).toBeNull();
    expect(validateStaffResetPassword("é".repeat(40))).toMatch(/72 bytes/);
    expect(validateStaffResetPassword("a".repeat(72))).toBeNull();
    expect(validateStaffResetPassword("a".repeat(73))).toMatch(/72 bytes/);
  });

  it("requires email, project, and gym confirmation before a write", () => {
    expect(() =>
      assertStaffPasswordResetConfirmation({
        email: account.email,
        projectId: "test-project",
        gymId: account.gymId,
        confirmEmail: account.email,
        confirmProjectId: "test-project",
        confirmGymId: account.gymId!,
      }),
    ).not.toThrow();

    expect(() =>
      assertStaffPasswordResetConfirmation({
        email: account.email,
        projectId: "test-project",
        gymId: account.gymId,
        confirmEmail: "other@gmail.com",
        confirmProjectId: "test-project",
        confirmGymId: account.gymId!,
      }),
    ).toThrow(/Email confirmation/);

    expect(() =>
      assertStaffPasswordResetConfirmation({
        email: account.email,
        projectId: "test-project",
        gymId: null,
        confirmEmail: account.email,
        confirmProjectId: "test-project",
        confirmGymId: "gym-1",
      }),
    ).toThrow(/no gym ID/);
  });

  it("patches passwordHash, updatedAt and increments credentialsVersion", () => {
    const updatedAt = new Date("2026-11-19T08:00:00.000Z");
    expect(
      staffPasswordResetPatch({
        passwordHash: "hashed",
        updatedAt,
        currentCredentialsVersion: 2,
      }),
    ).toEqual({
      passwordHash: "hashed",
      updatedAt,
      credentialsVersion: 3,
    });
    expect(
      staffPasswordResetPatch({ passwordHash: "hashed", updatedAt }),
    ).toMatchObject({
      credentialsVersion: 1,
    });
  });
});
