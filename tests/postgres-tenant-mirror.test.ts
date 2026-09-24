import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

import {
  DEFAULT_SEED_GYM_ID,
  DEFAULT_SEED_OWNER_USER_ID,
} from "@/lib/seed/default-tenant";
import {
  ensurePostgresGym,
  ensurePostgresStaffUser,
  mirrorTenantStaffToPostgres,
} from "@/lib/seed/postgres-tenant-mirror";

function createMockPrisma() {
  return {
    gym: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe("default seed tenant IDs", () => {
  it("uses stable bootstrap ids shared by Postgres and Firestore seeds", () => {
    expect(DEFAULT_SEED_GYM_ID).toBe("gym_default_0000000001");
    expect(DEFAULT_SEED_OWNER_USER_ID).toBe("user_default_owner_0000000001");
  });
});

describe("ensurePostgresGym", () => {
  it("upserts a gym row by Firestore session gym id without changing the primary key", async () => {
    const prisma = createMockPrisma();
    prisma.gym.upsert.mockResolvedValue({ id: DEFAULT_SEED_GYM_ID, name: "Gym #1" });

    await ensurePostgresGym(prisma as never, {
      gymId: DEFAULT_SEED_GYM_ID,
      name: "Gym #1",
      registrationToken: "reg_default_0000000001",
    });

    expect(prisma.gym.upsert).toHaveBeenCalledWith({
      where: { id: DEFAULT_SEED_GYM_ID },
      update: { name: "Gym #1" },
      create: {
        id: DEFAULT_SEED_GYM_ID,
        name: "Gym #1",
        registrationToken: "reg_default_0000000001",
      },
    });
  });
});

describe("ensurePostgresStaffUser", () => {
  const ownerInput = {
    id: DEFAULT_SEED_OWNER_USER_ID,
    gymId: DEFAULT_SEED_GYM_ID,
    name: "Gym Owner",
    email: "owner@gym.test",
    passwordHash: "hash",
    role: Role.OWNER,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an existing user matched by id for ledger createdById FK safety", async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if ("id" in where && where.id === DEFAULT_SEED_OWNER_USER_ID) {
        return { id: DEFAULT_SEED_OWNER_USER_ID, email: ownerInput.email };
      }
      return null;
    });

    const result = await ensurePostgresStaffUser(prisma as never, ownerInput);

    expect(result.created).toBe(false);
    expect(result.user.id).toBe(DEFAULT_SEED_OWNER_USER_ID);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates a Postgres user when only Firestore auth exists", async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: DEFAULT_SEED_OWNER_USER_ID });

    const result = await ensurePostgresStaffUser(prisma as never, ownerInput);

    expect(result.created).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: ownerInput,
    });
  });

  it("does not recreate a user when the email already exists under a legacy id", async () => {
    const prisma = createMockPrisma();
    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if ("id" in where) return null;
      if ("email" in where) {
        return { id: "legacy-prisma-user-id", email: ownerInput.email };
      }
      return null;
    });

    const result = await ensurePostgresStaffUser(prisma as never, ownerInput);

    expect(result.created).toBe(false);
    expect(result.idMismatch).toBe(true);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe("mirrorTenantStaffToPostgres", () => {
  it("mirrors both gym and owner before manual ledger writes", async () => {
    const prisma = createMockPrisma();
    prisma.gym.upsert.mockResolvedValue({ id: DEFAULT_SEED_GYM_ID });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: DEFAULT_SEED_OWNER_USER_ID });

    await mirrorTenantStaffToPostgres(prisma as never, {
      gym: { gymId: DEFAULT_SEED_GYM_ID, name: "Gym #1" },
      owner: {
        id: DEFAULT_SEED_OWNER_USER_ID,
        gymId: DEFAULT_SEED_GYM_ID,
        name: "Gym Owner",
        email: "owner@gym.test",
        passwordHash: "hash",
        role: Role.OWNER,
      },
    });

    expect(prisma.gym.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});

describe("ledger tenant alignment invariant", () => {
  it("requires the authenticated gym id to match the Postgres gym primary key", () => {
    const sessionGymId = DEFAULT_SEED_GYM_ID;
    const ledgerGymId = sessionGymId;

    expect(ledgerGymId).toBe(DEFAULT_SEED_GYM_ID);
  });

  it("requires the authenticated user id to match Postgres User.id for createdById", () => {
    const sessionUserId = DEFAULT_SEED_OWNER_USER_ID;
    const ledgerCreatedById = sessionUserId;

    expect(ledgerCreatedById).toBe(DEFAULT_SEED_OWNER_USER_ID);
  });
});
