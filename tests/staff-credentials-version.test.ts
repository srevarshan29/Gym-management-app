import { beforeEach, describe, expect, it, vi } from "vitest";

import { authConfig } from "@/auth.config";
import { memberAuthConfig } from "@/member-auth.config";
import {
  nextCredentialsVersion,
  resolveCredentialsVersion,
} from "@/lib/staff-auth/credentials-version";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

const authMock = vi.hoisted(() => vi.fn());
const findById = vi.hoisted(() => vi.fn());
const getGymById = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    redirectMock(...args);
    throw new Error("REDIRECT");
  },
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    users: { findById },
    gyms: { getById: getGymById },
  }),
  platformContext: { kind: "platform" },
}));

vi.mock("@/lib/server-perf", () => ({
  measureServerPhase: (_label: string, fn: () => unknown) => fn(),
}));

async function loadGetCurrentUser() {
  vi.resetModules();
  const mod = await import("@/lib/session");
  return mod.getCurrentUser;
}

describe("credentialsVersion helpers", () => {
  it("defaults legacy values to 0 and increments safely", () => {
    expect(resolveCredentialsVersion(undefined)).toBe(0);
    expect(resolveCredentialsVersion(null)).toBe(0);
    expect(resolveCredentialsVersion("1")).toBe(0);
    expect(nextCredentialsVersion(undefined)).toBe(1);
    expect(nextCredentialsVersion(2)).toBe(3);
  });
});

describe("staff session credential validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGymById.mockResolvedValue({ id: "gym-a", status: "active" });
  });

  it("allows legacy JWT version 0 with legacy DB version 0", async () => {
    authMock.mockResolvedValue({
      user: { id: "staff-1" },
    });
    findById.mockResolvedValue({
      id: "staff-1",
      name: "Staff",
      email: "staff@gym.test",
      role: "STAFF",
      gymId: "gym-a",
    });

    const getCurrentUser = await loadGetCurrentUser();
    const user = await getCurrentUser();
    expect(user?.id).toBe("staff-1");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("allows matching credential versions", async () => {
    authMock.mockResolvedValue({
      user: { id: "staff-1", credentialsVersion: 3 },
    });
    findById.mockResolvedValue({
      id: "staff-1",
      name: "Staff",
      email: "staff@gym.test",
      role: "STAFF",
      gymId: "gym-a",
      credentialsVersion: 3,
    });

    const getCurrentUser = await loadGetCurrentUser();
    const user = await getCurrentUser();
    expect(user?.id).toBe("staff-1");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects stale staff sessions to logout after password reset", async () => {
    authMock.mockResolvedValue({
      user: { id: "staff-1", credentialsVersion: 0 },
    });
    findById.mockResolvedValue({
      id: "staff-1",
      name: "Staff",
      email: "staff@gym.test",
      role: "STAFF",
      gymId: "gym-a",
      credentialsVersion: 1,
    });

    const getCurrentUser = await loadGetCurrentUser();
    await expect(getCurrentUser()).rejects.toThrow("REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/logout");
  });
});

describe("staff JWT/session propagation", () => {
  it("stores credentialsVersion on staff JWT and session", () => {
    const token = authConfig.callbacks.jwt({
      token: {},
      user: {
        id: "staff-1",
        credentialsVersion: 5,
        role: "OWNER",
        gymId: "gym-a",
        name: "Owner",
        email: "owner@gym.test",
      },
      account: null,
    });

    expect(token.credentialsVersion).toBe(5);

    const session = authConfig.callbacks.session({
      session: {
        user: { id: "staff-1", email: "owner@gym.test" },
        expires: "2099-01-01T00:00:00.000Z",
      },
      token,
    } as Parameters<NonNullable<typeof authConfig.callbacks.session>>[0]);

    expect(session.user?.credentialsVersion).toBe(5);
  });

  it("does not change member auth config", () => {
    expect(memberAuthConfig.session?.strategy).toBe("jwt");
    expect(memberAuthConfig.basePath).toBe("/api/member-auth");
    expect(memberAuthConfig.callbacks.jwt?.toString()).not.toContain(
      "credentialsVersion",
    );
  });
});