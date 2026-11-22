import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  STAFF_PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  STAFF_PASSWORD_RESET_RATE_LIMIT_MESSAGE,
  buildStaffPasswordResetUrl,
  completeStaffPasswordReset,
  generateStaffPasswordResetToken,
  hashStaffPasswordResetToken,
  requestStaffPasswordReset,
} from "@/lib/staff-auth/self-service-password-reset";
import { COLLECTIONS } from "@/lib/firestore/collections";
import {
  STAFF_PASSWORD_RESET_EMAIL_LIMIT,
  StaffPasswordResetRequestThrottlesRepository,
} from "@/lib/firestore/repositories/staff-password-reset-request-throttles";
import { StaffPasswordResetTokensRepository } from "@/lib/firestore/repositories/staff-password-reset-tokens";
import { authConfig } from "@/auth.config";
import { isStaffPasswordRecoveryPath } from "@/lib/staff-auth/staff-recovery-routes";
import { sendStaffPasswordResetEmail } from "@/lib/email/send-staff-password-reset-email";

const sendTransactionalEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/email/send-transactional-email", () => ({
  sendTransactionalEmail: (...args: unknown[]) => sendTransactionalEmail(...args),
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
            async delete() {
              docs.delete(key(name, id));
            },
          };
        },
      };
    },
    _txChain: Promise.resolve() as Promise<unknown>,
    async runTransaction<T>(fn: (tx: {
      get: (ref: { collection: string; id: string }) => Promise<{ exists: boolean; data: () => MemoryDoc | undefined; id: string }>;
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

      const chained = (db as { _txChain: Promise<unknown> })._txChain.then(execute, execute);
      (db as { _txChain: Promise<unknown> })._txChain = chained.then(
        () => undefined,
        () => undefined,
      );
      return chained as Promise<T>;
    },
  };
  (db as { _txChain: Promise<unknown> })._txChain = Promise.resolve();

  return { db, docs };
}

describe("staff self-service password reset flow", () => {
  const superAdminAccount = {
    id: "user-1",
    email: "super@gymdesk.test",
    gymId: null,
  };

  beforeEach(() => {
    sendTransactionalEmail.mockReset();
    sendTransactionalEmail.mockResolvedValue({ outcome: "sent" });
    process.env.NEXT_PUBLIC_APP_URL = "https://app.gymdesk.test";
  });

  it("sends a reset email for an existing account and stores only the token hash", async () => {
    const createResetToken = vi.fn(async (input) => {
      expect(input.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(input.tokenHash).not.toBe(input.email);
    });
    const sendResetEmail = vi.fn(async (input) => {
      expect(input.resetUrl).toContain("/reset-password?token=");
      return { outcome: "sent" as const };
    });

    const result = await requestStaffPasswordReset(superAdminAccount.email, {
      now: new Date("2026-01-01T00:00:00.000Z"),
      findStaffAccountsByEmail: async () => [superAdminAccount],
      consumeRequestAllowance: async () => ({ ok: true }),
      createResetToken,
      sendResetEmail,
      resolveAppBaseUrl: () => "https://app.gymdesk.test",
    });

    expect(result.outcome).toBe("success");
    expect(result.message).toBe(STAFF_PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE);
    expect(createResetToken).toHaveBeenCalled();
    expect(sendResetEmail).toHaveBeenCalled();
  });

  it("does not issue a reset email for gym staff accounts", async () => {
    const createResetToken = vi.fn();
    const sendResetEmail = vi.fn();
    const gymStaffAccount = {
      id: "staff-1",
      email: "staff@gym.test",
      gymId: "gym-1",
    };

    const result = await requestStaffPasswordReset(gymStaffAccount.email, {
      findStaffAccountsByEmail: async () => [],
      consumeRequestAllowance: async () => ({ ok: true }),
      createResetToken,
      sendResetEmail,
      resolveAppBaseUrl: () => "https://app.gymdesk.test",
    });

    expect(result.outcome).toBe("success");
    expect(createResetToken).not.toHaveBeenCalled();
    expect(sendResetEmail).not.toHaveBeenCalled();
  });

  it("returns the same generic response for an unknown email", async () => {
    const sendResetEmail = vi.fn();
    const createResetToken = vi.fn();

    const result = await requestStaffPasswordReset("unknown@gym.test", {
      findStaffAccountsByEmail: async () => [],
      consumeRequestAllowance: async () => ({ ok: true }),
      createResetToken,
      sendResetEmail,
      resolveAppBaseUrl: () => "https://app.gymdesk.test",
    });

    expect(result).toEqual({
      outcome: "success",
      message: STAFF_PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
    });
    expect(createResetToken).not.toHaveBeenCalled();
    expect(sendResetEmail).not.toHaveBeenCalled();
  });

  it("enforces rate limits without revealing account state", async () => {
    const result = await requestStaffPasswordReset(superAdminAccount.email, {
      findStaffAccountsByEmail: async () => [superAdminAccount],
      consumeRequestAllowance: async () => ({
        ok: false,
        retryAfterMs: 60_000,
      }),
      createResetToken: vi.fn(),
      sendResetEmail: vi.fn(),
      resolveAppBaseUrl: () => "https://app.gymdesk.test",
    });

    expect(result).toEqual({
      outcome: "rate_limited",
      message: STAFF_PASSWORD_RESET_RATE_LIMIT_MESSAGE,
    });
  });

  it("still returns success when email delivery fails", async () => {
    const result = await requestStaffPasswordReset(superAdminAccount.email, {
      findStaffAccountsByEmail: async () => [superAdminAccount],
      consumeRequestAllowance: async () => ({ ok: true }),
      createResetToken: vi.fn(),
      sendResetEmail: async () => ({ outcome: "failed" }),
      resolveAppBaseUrl: () => "https://app.gymdesk.test",
    });

    expect(result.outcome).toBe("success");
  });
});

describe("staff password reset token redemption", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");
  const rawToken = generateStaffPasswordResetToken();
  const tokenHash = hashStaffPasswordResetToken(rawToken);

  it("rejects invalid tokens", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetTokensRepository(db as never);
    const outcome = await repo.redeemToken(
      tokenHash,
      await bcrypt.hash("password-one", 10),
      now,
    );
    expect(outcome).toBe("invalid_token");
  });

  it("rejects expired tokens", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetTokensRepository(db as never);
    await db.collection(COLLECTIONS.users).doc("user-1").set({
      email: "super@gymdesk.test",
      gymId: null,
      role: "SUPER_ADMIN",
      passwordHash: "old-hash",
    });
    await repo.createToken({
      tokenHash,
      userId: "user-1",
      email: "super@gymdesk.test",
      gymId: null,
      createdAt: new Date("2026-06-01T11:00:00.000Z"),
      expiresAt: new Date("2026-06-01T11:30:00.000Z"),
    });

    const outcome = await repo.redeemToken(
      tokenHash,
      await bcrypt.hash("new-password-1", 10),
      now,
    );
    expect(outcome).toBe("expired_token");
  });

  it("rejects reused tokens", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetTokensRepository(db as never);
    await db.collection(COLLECTIONS.users).doc("user-1").set({
      email: "super@gymdesk.test",
      gymId: null,
      role: "SUPER_ADMIN",
      passwordHash: "old-hash",
    });
    await repo.createToken({
      tokenHash,
      userId: "user-1",
      email: "super@gymdesk.test",
      gymId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    });
    await repo.markUsed(tokenHash, now);

    const outcome = await repo.redeemToken(
      tokenHash,
      await bcrypt.hash("new-password-1", 10),
      now,
    );
    expect(outcome).toBe("used_token");
  });

  it("rejects password reset redemption for gym staff accounts", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetTokensRepository(db as never);
    await db.collection(COLLECTIONS.users).doc("user-1").set({
      email: "staff@gym.test",
      gymId: "gym-1",
      role: "STAFF",
      passwordHash: "old-hash",
    });
    await repo.createToken({
      tokenHash,
      userId: "user-1",
      email: "staff@gym.test",
      gymId: "gym-1",
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    });

    const outcome = await repo.redeemToken(
      tokenHash,
      await bcrypt.hash("new-password-9", 10),
      now,
    );
    expect(outcome).toBe("invalid_token");
  });

  it("resets the password, increments credentialsVersion and marks the token used", async () => {
    const { db, docs } = createMockFirestore();
    const repo = new StaffPasswordResetTokensRepository(db as never);
    await db.collection(COLLECTIONS.users).doc("user-1").set({
      email: "super@gymdesk.test",
      gymId: null,
      role: "SUPER_ADMIN",
      passwordHash: "old-hash",
    });
    await repo.createToken({
      tokenHash,
      userId: "user-1",
      email: "super@gymdesk.test",
      gymId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    });

    const newHash = await bcrypt.hash("new-password-9", 10);
    const outcome = await repo.redeemToken(tokenHash, newHash, now);
    expect(outcome).toBe("success");
    const user = docs.get(`${COLLECTIONS.users}/user-1`);
    expect(user?.passwordHash).toBe(newHash);
    expect(user?.credentialsVersion).toBe(1);
    const token = docs.get(`${COLLECTIONS.staffPasswordResetTokens}/${tokenHash}`);
    expect(token?.credentialsVersion).toBe(0);
    expect(token?.usedAt).toBeDefined();
  });

  it("stores the current credentialsVersion on newly issued tokens", async () => {
    const { db, docs } = createMockFirestore();
    const repo = new StaffPasswordResetTokensRepository(db as never);
    await db.collection(COLLECTIONS.users).doc("user-1").set({
      email: "super@gymdesk.test",
      gymId: null,
      role: "SUPER_ADMIN",
      passwordHash: "old-hash",
      credentialsVersion: 4,
    });

    const result = await repo.createToken({
      tokenHash,
      userId: "user-1",
      email: "super@gymdesk.test",
      gymId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    });

    expect(result.credentialsVersion).toBe(4);
    const token = docs.get(`${COLLECTIONS.staffPasswordResetTokens}/${tokenHash}`);
    expect(token?.credentialsVersion).toBe(4);
  });

  it("rejects an older outstanding token after a successful reset", async () => {
    const { db, docs } = createMockFirestore();
    const repo = new StaffPasswordResetTokensRepository(db as never);
    const tokenHashB = hashStaffPasswordResetToken(generateStaffPasswordResetToken());

    await db.collection(COLLECTIONS.users).doc("user-1").set({
      email: "super@gymdesk.test",
      gymId: null,
      role: "SUPER_ADMIN",
      passwordHash: "old-hash",
    });
    await repo.createToken({
      tokenHash,
      userId: "user-1",
      email: "super@gymdesk.test",
      gymId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    });
    await repo.createToken({
      tokenHash: tokenHashB,
      userId: "user-1",
      email: "super@gymdesk.test",
      gymId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    });

    const firstOutcome = await repo.redeemToken(
      tokenHash,
      await bcrypt.hash("password-a-123", 10),
      now,
    );
    expect(firstOutcome).toBe("success");
    expect(docs.get(`${COLLECTIONS.users}/user-1`)?.credentialsVersion).toBe(1);

    const secondOutcome = await repo.redeemToken(
      tokenHashB,
      await bcrypt.hash("password-b-123", 10),
      now,
    );
    expect(secondOutcome).toBe("invalid_token");
  });

  it("prevents concurrent redemption of the same token", async () => {
    const { db, docs } = createMockFirestore();
    const repo = new StaffPasswordResetTokensRepository(db as never);
    await db.collection(COLLECTIONS.users).doc("user-1").set({
      email: "super@gymdesk.test",
      gymId: null,
      role: "SUPER_ADMIN",
      passwordHash: "old-hash",
    });
    await repo.createToken({
      tokenHash,
      userId: "user-1",
      email: "super@gymdesk.test",
      gymId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    });

    const hashA = await bcrypt.hash("password-a-123", 10);
    const hashB = await bcrypt.hash("password-b-123", 10);

    const [first, second] = await Promise.all([
      repo.redeemToken(tokenHash, hashA, now),
      repo.redeemToken(tokenHash, hashB, now),
    ]);

    const outcomes = [first, second].sort();
    expect(outcomes).toEqual(["success", "used_token"]);
    const user = docs.get(`${COLLECTIONS.users}/user-1`);
    expect([hashA, hashB]).toContain(user?.passwordHash);
    expect(user?.credentialsVersion).toBe(1);
  });

  it("prevents concurrent redemption of different tokens for the same user", async () => {
    const { db, docs } = createMockFirestore();
    const repo = new StaffPasswordResetTokensRepository(db as never);
    const tokenHashB = hashStaffPasswordResetToken(generateStaffPasswordResetToken());

    await db.collection(COLLECTIONS.users).doc("user-1").set({
      email: "super@gymdesk.test",
      gymId: null,
      role: "SUPER_ADMIN",
      passwordHash: "old-hash",
    });
    await repo.createToken({
      tokenHash,
      userId: "user-1",
      email: "super@gymdesk.test",
      gymId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    });
    await repo.createToken({
      tokenHash: tokenHashB,
      userId: "user-1",
      email: "super@gymdesk.test",
      gymId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
    });

    const [first, second] = await Promise.all([
      repo.redeemToken(tokenHash, await bcrypt.hash("password-a-123", 10), now),
      repo.redeemToken(
        tokenHashB,
        await bcrypt.hash("password-b-123", 10),
        now,
      ),
    ]);

    const outcomes = [first, second].sort();
    expect(outcomes).toEqual(["invalid_token", "success"]);
    expect(docs.get(`${COLLECTIONS.users}/user-1`)?.credentialsVersion).toBe(1);
  });
});

describe("completeStaffPasswordReset validation", () => {
  it("rejects password mismatch and invalid passwords", async () => {
    const mismatch = await completeStaffPasswordReset({
      rawToken: generateStaffPasswordResetToken(),
      password: "password-1",
      confirmPassword: "password-2",
      deps: {
        hashPassword: async () => "hash",
        redeemToken: async () => "invalid_token",
      },
    });
    expect(mismatch.outcome).toBe("password_mismatch");

    const short = await completeStaffPasswordReset({
      rawToken: generateStaffPasswordResetToken(),
      password: "short",
      confirmPassword: "short",
      deps: {
        hashPassword: async () => "hash",
        redeemToken: async () => "invalid_token",
      },
    });
    expect(short.outcome).toBe("validation_error");
  });
});

describe("staff password reset throttling repository", () => {
  it("blocks after the email limit is reached", async () => {
    const { db } = createMockFirestore();
    const repo = new StaffPasswordResetRequestThrottlesRepository(db as never);
    const now = new Date("2026-01-01T00:00:00.000Z");

    for (let i = 0; i < STAFF_PASSWORD_RESET_EMAIL_LIMIT; i++) {
      const result = await repo.checkAndConsume(
        { emailKey: "email-key", ipKey: `ip-${i}` },
        now,
      );
      expect(result.ok).toBe(true);
    }

    const blocked = await repo.checkAndConsume(
      { emailKey: "email-key", ipKey: "ip-blocked" },
      now,
    );
    expect(blocked.ok).toBe(false);
  });
});

describe("staff password reset email", () => {
  it("uses transactional email without leaking tokens in logs", async () => {
    const rawToken = generateStaffPasswordResetToken();
    const resetUrl = buildStaffPasswordResetUrl("https://app.gymdesk.test", rawToken);
    const expiresAt = new Date("2026-01-01T00:30:00.000Z");

    const result = await sendStaffPasswordResetEmail({
      to: "staff@gym.test",
      resetUrl,
      expiresAt,
    });

    expect(result.outcome).toBe("sent");
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "staff@gym.test",
        subject: expect.stringContaining("GymDesk"),
      }),
    );
    const html = String(sendTransactionalEmail.mock.calls[0]?.[0]?.html ?? "");
    expect(html).toContain(resetUrl);
    expect(html).not.toMatch(/passwordHash/i);
  });

  it("returns failed when the provider errors", async () => {
    sendTransactionalEmail.mockResolvedValueOnce({
      outcome: "failed",
      message: "resend down",
    });

    const result = await sendStaffPasswordResetEmail({
      to: "staff@gym.test",
      resetUrl: "https://app.gymdesk.test/reset-password?token=abc",
      expiresAt: new Date(),
    });

    expect(result).toEqual({ outcome: "failed", message: "resend down" });
  });
});

describe("staff recovery routes in auth config", () => {
  function authorized(path: string, isLoggedIn: boolean) {
    return authConfig.callbacks.authorized({
      auth: isLoggedIn
        ? {
            user: { id: "u1", role: "OWNER", gymId: "gym-1", email: "a@test.com" },
            expires: "2099-01-01T00:00:00.000Z",
          }
        : null,
      request: {
        nextUrl: new URL(`https://app.gymdesk.test${path}`),
      },
    } as Parameters<typeof authConfig.callbacks.authorized>[0]);
  }

  it("recognizes recovery paths", () => {
    expect(isStaffPasswordRecoveryPath("/forgot-password")).toBe(true);
    expect(isStaffPasswordRecoveryPath("/reset-password")).toBe(true);
    expect(isStaffPasswordRecoveryPath("/login")).toBe(false);
  });

  it("allows unauthenticated forgot and reset routes", () => {
    expect(authorized("/forgot-password", false)).toBe(true);
    expect(authorized("/reset-password", false)).toBe(true);
  });

  it("blocks unauthenticated staff dashboard routes", () => {
    expect(authorized("/", false)).toBe(false);
    expect(authorized("/members", false)).toBe(false);
  });

  it("does not expose member portal auth behavior", () => {
    expect(authorized("/member/login", false)).toBe(false);
  });
});

describe("reset token helpers", () => {
  it("generates high-entropy tokens and stable hashes", () => {
    const token = generateStaffPasswordResetToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    const hash = hashStaffPasswordResetToken(token);
    expect(hash).toHaveLength(64);
    expect(hashStaffPasswordResetToken(` ${token} `)).toBe(hash);
  });
});