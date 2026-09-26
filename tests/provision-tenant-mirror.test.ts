import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

import {
  inspectTenantMirrorProvision,
  loadFirestoreTenantMirrorInputs,
  parseTenantMirrorProvisionCliArgs,
  provisionTenantMirrorToPostgres,
} from "@/lib/seed/provision-tenant-mirror";

const GYM_ID = "cc729470b49c4701bc3edeb06";
const OWNER_ID = "adced0588b404927ac4e04451";

function createMockRepos() {
  return {
    gyms: {
      getById: vi.fn(),
    },
    users: {
      findOwnerByGym: vi.fn(),
      findById: vi.fn(),
    },
  };
}

function createMockPrisma() {
  return {
    gym: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe("tenant mirror provision CLI safeguards", () => {
  function provisionEnv(
    overrides: Record<string, string | undefined> = {},
  ): NodeJS.ProcessEnv {
    const env = { ...process.env };
    delete env.TENANT_PROVISION_APPLY;
    delete env.TENANT_PROVISION_CONFIRM;
    return { ...env, ...overrides };
  }

  it("defaults to dry-run", () => {
    expect(
      parseTenantMirrorProvisionCliArgs(["--gym-id", GYM_ID], provisionEnv()),
    ).toMatchObject({ dryRun: true, gymId: GYM_ID });
  });

  it("enters apply mode when --apply --confirm are present", () => {
    expect(
      parseTenantMirrorProvisionCliArgs(
        ["--gym-id", GYM_ID, "--apply", "--confirm"],
        provisionEnv(),
      ),
    ).toMatchObject({
      dryRun: false,
      applyRequested: true,
      confirm: true,
    });
  });
});

describe("inspectTenantMirrorProvision", () => {
  const repos = createMockRepos();
  const prisma = createMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports ready when Firestore tenant exists and Postgres gym is missing", async () => {
    repos.gyms.getById.mockResolvedValue({
      id: GYM_ID,
      name: "ram",
      registrationToken: "token",
    });
    repos.users.findOwnerByGym.mockResolvedValue({
      id: OWNER_ID,
      name: "ram",
      email: "ram@gmail.com",
    });
    repos.users.findById.mockResolvedValue({
      id: OWNER_ID,
      gymId: GYM_ID,
      name: "ram",
      email: "ram@gmail.com",
      passwordHash: "hash",
      role: "OWNER",
    });
    prisma.gym.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);

    const inspection = await inspectTenantMirrorProvision({
      ctx: {} as never,
      prisma: prisma as never,
      gymId: GYM_ID,
      gyms: repos.gyms as never,
      users: repos.users as never,
    });

    expect(inspection.canProvision).toBe(true);
    expect(inspection.postgresGymExists).toBe(false);
    expect(inspection.alreadyProvisioned).toBe(false);
  });

  it("blocks when Postgres owner email exists under a legacy id", async () => {
    repos.gyms.getById.mockResolvedValue({
      id: GYM_ID,
      name: "ram",
      registrationToken: "token",
    });
    repos.users.findOwnerByGym.mockResolvedValue({
      id: OWNER_ID,
      name: "ram",
      email: "ram@gmail.com",
    });
    repos.users.findById.mockResolvedValue({
      id: OWNER_ID,
      gymId: GYM_ID,
      name: "ram",
      email: "ram@gmail.com",
      passwordHash: "hash",
      role: "OWNER",
    });
    prisma.gym.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if ("id" in where && where.id === OWNER_ID) return null;
      if ("email" in where) {
        return { id: "legacy-user-id", email: "ram@gmail.com", gymId: GYM_ID };
      }
      return null;
    });

    const inspection = await inspectTenantMirrorProvision({
      ctx: {} as never,
      prisma: prisma as never,
      gymId: GYM_ID,
      gyms: repos.gyms as never,
      users: repos.users as never,
    });

    expect(inspection.canProvision).toBe(false);
    expect(inspection.postgresOwnerIdMismatch).toBe(true);
  });
});

describe("loadFirestoreTenantMirrorInputs", () => {
  it("loads exact Firestore ids for mirrorTenantStaffToPostgres", async () => {
    const repos = createMockRepos();
    repos.gyms.getById.mockResolvedValue({
      id: GYM_ID,
      name: "ram",
      registrationToken: "token",
    });
    repos.users.findOwnerByGym.mockResolvedValue({
      id: OWNER_ID,
      name: "ram",
      email: "ram@gmail.com",
    });
    repos.users.findById.mockResolvedValue({
      id: OWNER_ID,
      gymId: GYM_ID,
      name: "ram",
      email: "ram@gmail.com",
      passwordHash: "hash",
      role: "OWNER",
    });

    const inputs = await loadFirestoreTenantMirrorInputs({
      ctx: {} as never,
      gymId: GYM_ID,
      gyms: repos.gyms as never,
      users: repos.users as never,
    });

    expect(inputs.gym).toEqual({
      gymId: GYM_ID,
      name: "ram",
      registrationToken: "token",
    });
    expect(inputs.owner).toEqual({
      id: OWNER_ID,
      gymId: GYM_ID,
      name: "ram",
      email: "ram@gmail.com",
      passwordHash: "hash",
      role: Role.OWNER,
    });
  });
});

describe("provisionTenantMirrorToPostgres", () => {
  it("does not write in dry-run mode", async () => {
    const repos = createMockRepos();
    const prisma = createMockPrisma();

    repos.gyms.getById.mockResolvedValue({
      id: GYM_ID,
      name: "ram",
      registrationToken: "token",
    });
    repos.users.findOwnerByGym.mockResolvedValue({
      id: OWNER_ID,
      name: "ram",
      email: "ram@gmail.com",
    });
    repos.users.findById.mockResolvedValue({
      id: OWNER_ID,
      gymId: GYM_ID,
      name: "ram",
      email: "ram@gmail.com",
      passwordHash: "hash",
      role: "OWNER",
    });
    prisma.gym.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await provisionTenantMirrorToPostgres({
      ctx: {} as never,
      prisma: prisma as never,
      gymId: GYM_ID,
      gyms: repos.gyms as never,
      users: repos.users as never,
      dryRun: true,
    });

    expect(result.applied).toBe(false);
    expect(result.gymCreated).toBe(true);
    expect(prisma.gym.upsert).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("mirrors gym and owner on apply", async () => {
    const repos = createMockRepos();
    const prisma = createMockPrisma();

    repos.gyms.getById.mockResolvedValue({
      id: GYM_ID,
      name: "ram",
      registrationToken: "token",
    });
    repos.users.findOwnerByGym.mockResolvedValue({
      id: OWNER_ID,
      name: "ram",
      email: "ram@gmail.com",
    });
    repos.users.findById.mockResolvedValue({
      id: OWNER_ID,
      gymId: GYM_ID,
      name: "ram",
      email: "ram@gmail.com",
      passwordHash: "hash",
      role: "OWNER",
    });
    prisma.gym.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.gym.upsert.mockResolvedValue({ id: GYM_ID });
    prisma.user.create.mockResolvedValue({ id: OWNER_ID });

    const result = await provisionTenantMirrorToPostgres({
      ctx: {} as never,
      prisma: prisma as never,
      gymId: GYM_ID,
      gyms: repos.gyms as never,
      users: repos.users as never,
      dryRun: false,
    });

    expect(result.applied).toBe(true);
    expect(prisma.gym.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});
