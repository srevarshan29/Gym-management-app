import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  STAFF_PASSWORD_RESET_EMAIL_LIMIT,
  STAFF_PASSWORD_RESET_IP_LIMIT,
  StaffPasswordResetRequestThrottlesRepository,
} from "@/lib/firestore/repositories/staff-password-reset-request-throttles";
import {
  STAFF_PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  STAFF_PASSWORD_RESET_RATE_LIMIT_MESSAGE,
  requestStaffPasswordReset,
} from "@/lib/staff-auth/self-service-password-reset";
import {
  checkStaffPasswordResetRequestThrottle,
  staffPasswordResetEmailThrottleKey,
  staffPasswordResetIpThrottleKey,
} from "@/lib/staff-auth/staff-password-reset-request-throttle";

const { checkAndConsume, getRepositories } = vi.hoisted(() => ({
  checkAndConsume: vi.fn(),
  getRepositories: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories,
}));

type MemoryDoc = Record<string, unknown>;

function createMockFirestore() {
  const docs = new Map<string, MemoryDoc>();
  const key = (collection: string, id: string) => `${collection}/${id}`;

  const db = {
    collection(name: string) {
      return {
        doc(id: string) {
          return {
            id,
            collection: name,
            async get() {
              const data = docs.get(key(name, id));
              return {
                exists: data !== undefined,
                data: () => data,
                id,
              };
            },
            async set(data: MemoryDoc) {
              docs.set(key(name, id), { ...data });
            },
            async update(data: MemoryDoc) {
              const existing = docs.get(key(name, id)) ?? {};
              docs.set(key(name, id), { ...existing, ...data });
            },
          };
        },
      };
    },
    _txChain: Promise.resolve() as Promise<unknown>,
    async runTransaction<T>(fn: (tx: {
      get: (ref: { collection: string; id: string }) => Promise<{
        exists: boolean;
        data: () => MemoryDoc | undefined;
        id: string;
      }>;
      set: (ref: { collection: string; id: string }, data: MemoryDoc) => void;
      update: (ref: { collection: string; id: string }, data: MemoryDoc) => void;
    }) => Promise<T>): Promise<T> {
      const execute = async () => {
        const pendingSets = new Map<string, MemoryDoc>();
        const pendingUpdates = new Map<string, MemoryDoc>();

        const tx = {
          async get(ref: { collection: string; id: string }) {
            const k = key(ref.collection, ref.id);
            const merged = {
              ...(docs.get(k) ?? {}),
              ...(pendingSets.get(k) ?? {}),
              ...(pendingUpdates.get(k) ?? {}),
            };
            const exists = docs.has(k) || pendingSets.has(k);
            return {
              exists,
              data: () => (exists ? merged : undefined),
              id: ref.id,
            };
          },
          set(ref: { collection: string; id: string }, data: MemoryDoc) {
            pendingSets.set(key(ref.collection, ref.id), data);
          },
          update(ref: { collection: string; id: string }, data: MemoryDoc) {
            const k = key(ref.collection, ref.id);
            pendingUpdates.set(k, {
              ...(pendingUpdates.get(k) ?? {}),
              ...data,
            });
          },
        };

        const result = await fn(tx);

        for (const [k, data] of pendingSets) {
          docs.set(k, data);
        }
        for (const [k, patch] of pendingUpdates) {
          docs.set(k, { ...(docs.get(k) ?? {}), ...patch });
        }

        return result;
      };

      const chained = (db as { _txChain: Promise<unknown> })._txChain.then(
        execute,
        execute,
      );
      (db as { _txChain: Promise<unknown> })._txChain = chained.then(
        () => undefined,
        () => undefined,
      );
      return chained as Promise<T>;
    },
  };
  (db as { _txChain: Promise<unknown> })._txChain = Promise.resolve();

  return { db };
}

describe("checkStaffPasswordResetRequestThrottle", () => {
  beforeEach(() => {
    checkAndConsume.mockReset();
    getRepositories.mockReset();
    getRepositories.mockReturnValue({
      staffPasswordResetRequestThrottles: { checkAndConsume },
    });
  });

  it("allows when Firestore throttle check succeeds", async () => {
    checkAndConsume.mockResolvedValue({ ok: true });

    const result = await checkStaffPasswordResetRequestThrottle(
      "staff@gym.test",
      "203.0.113.1",
    );

    expect(result).toEqual({ ok: true });
    expect(checkAndConsume).toHaveBeenCalledWith(
      {
        emailKey: staffPasswordResetEmailThrottleKey("staff@gym.test"),
        ipKey: staffPasswordResetIpThrottleKey("203.0.113.1"),
      },
      expect.any(Date),
    );
  });

  it("blocks when email or IP bucket is over limit", async () => {
    checkAndConsume.mockResolvedValue({ ok: false, retryAfterMs: 120_000 });

    const result = await checkStaffPasswordResetRequestThrottle(
      "staff@gym.test",
      "203.0.113.1",
    );

    expect(result).toEqual({ ok: false, retryAfterMs: 120_000 });
  });

  it("blocks when Firestore read fails", async () => {
    checkAndConsume.mockRejectedValue(new Error("Firestore unavailable"));

    const result = await checkStaffPasswordResetRequestThrottle(
      "staff@gym.test",
      "203.0.113.1",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterMs).toBe(15 * 60 * 1000);
    }
  });

  it("blocks when Firestore write/update fails", async () => {
    checkAndConsume.mockRejectedValue(new Error("transaction aborted"));

    const result = await checkStaffPasswordResetRequestThrottle(
      "unknown@gym.test",
      "203.0.113.2",
    );

    expect(result.ok).toBe(false);
  });

  it("does not send reset email when throttle infrastructure fails", async () => {
    checkAndConsume.mockRejectedValue(new Error("read failed"));

    const sendResetEmail = vi.fn();
    const createResetToken = vi.fn();

    const result = await requestStaffPasswordReset("staff@gym.test", {
      findStaffAccountsByEmail: async () => [
        { id: "u1", email: "staff@gym.test", gymId: "gym-1" },
      ],
      consumeRequestAllowance: () =>
        checkStaffPasswordResetRequestThrottle("staff@gym.test", "203.0.113.1"),
      createResetToken,
      sendResetEmail,
      resolveAppBaseUrl: () => "https://app.gymdesk.test",
    });

    expect(result).toEqual({
      outcome: "rate_limited",
      message: STAFF_PASSWORD_RESET_RATE_LIMIT_MESSAGE,
    });
    expect(createResetToken).not.toHaveBeenCalled();
    expect(sendResetEmail).not.toHaveBeenCalled();
  });

  it("keeps generic success for unknown emails when throttle allows", async () => {
    checkAndConsume.mockResolvedValue({ ok: true });

    const result = await requestStaffPasswordReset("unknown@gym.test", {
      findStaffAccountsByEmail: async () => [],
      consumeRequestAllowance: () =>
        checkStaffPasswordResetRequestThrottle("unknown@gym.test", "203.0.113.3"),
      createResetToken: vi.fn(),
      sendResetEmail: vi.fn(),
      resolveAppBaseUrl: () => "https://app.gymdesk.test",
    });

    expect(result).toEqual({
      outcome: "success",
      message: STAFF_PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
    });
  });
});

describe("staff password reset throttle repository limits", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("allows requests within the email limit", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetRequestThrottlesRepository(db as never);

    for (let i = 0; i < STAFF_PASSWORD_RESET_EMAIL_LIMIT; i++) {
      const result = await repo.checkAndConsume(
        { emailKey: "email-key", ipKey: `ip-${i}` },
        now,
      );
      expect(result.ok).toBe(true);
    }
  });

  it("blocks after the email limit is reached", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetRequestThrottlesRepository(db as never);

    for (let i = 0; i < STAFF_PASSWORD_RESET_EMAIL_LIMIT; i++) {
      await repo.checkAndConsume(
        { emailKey: "email-key", ipKey: `ip-${i}` },
        now,
      );
    }

    const blocked = await repo.checkAndConsume(
      { emailKey: "email-key", ipKey: "ip-blocked" },
      now,
    );
    expect(blocked.ok).toBe(false);
  });

  it("blocks after the IP limit is reached", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetRequestThrottlesRepository(db as never);

    for (let i = 0; i < STAFF_PASSWORD_RESET_IP_LIMIT; i++) {
      const result = await repo.checkAndConsume(
        { emailKey: `email-${i}`, ipKey: "shared-ip" },
        now,
      );
      expect(result.ok).toBe(true);
    }

    const blocked = await repo.checkAndConsume(
      { emailKey: "email-new", ipKey: "shared-ip" },
      now,
    );
    expect(blocked.ok).toBe(false);
  });

  it("treats a missing throttle document as a first attempt", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetRequestThrottlesRepository(db as never);

    const result = await repo.checkAndConsume(
      { emailKey: "fresh-email", ipKey: "fresh-ip" },
      now,
    );
    expect(result).toEqual({ ok: true });
  });

  it("resets the window after windowEndsAt", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetRequestThrottlesRepository(db as never);
    const keys = { emailKey: "email-key", ipKey: "ip-1" };

    for (let i = 0; i < STAFF_PASSWORD_RESET_EMAIL_LIMIT; i++) {
      await repo.checkAndConsume(keys, now);
    }
    const blocked = await repo.checkAndConsume(keys, now);
    expect(blocked.ok).toBe(false);

    const afterWindow = new Date(now.getTime() + 15 * 60 * 1000 + 1);
    const allowed = await repo.checkAndConsume(keys, afterWindow);
    expect(allowed.ok).toBe(true);
  });

  it("fails a Firestore transaction error (not a missing doc)", async () => {
    const { db } = createMockFirestore();
    const failingDb = {
      ...db,
      runTransaction: () => Promise.reject(new Error("transaction failed")),
    };
    const repo = new StaffPasswordResetRequestThrottlesRepository(
      failingDb as never,
    );

    await expect(
      repo.checkAndConsume({ emailKey: "k", ipKey: "ip" }, now),
    ).rejects.toThrow("transaction failed");
  });

  it("persists count increments on successful consumes", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetRequestThrottlesRepository(db as never);
    const emailKey = "count-email";

    await repo.checkAndConsume({ emailKey, ipKey: "ip-a" }, now);
    const count = await repo.readCount(emailKey);
    expect(count).toBe(1);
  });
});