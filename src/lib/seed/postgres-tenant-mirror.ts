import { PrismaClient, type Role } from "@prisma/client";

/** Minimal client surface for gym upsert (works inside `$transaction`). */
export type PostgresGymUpsertClient = Pick<PrismaClient, "gym">;

export type PostgresGymMirrorInput = {
  gymId: string;
  name: string;
  registrationToken?: string;
};

export type PostgresStaffUserMirrorInput = {
  id: string;
  gymId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
};

/** Prisma client for seed/mirror scripts — uses DIRECT_URL when set. */
export function createSeedPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
    },
  });
}

/**
 * Ensures a Postgres `Gym` row exists for ledger FK (`LedgerTransaction.gymId`).
 * Never changes an existing gym's primary key.
 */
export async function ensurePostgresGym(
  prisma: PostgresGymUpsertClient,
  input: PostgresGymMirrorInput,
) {
  return prisma.gym.upsert({
    where: { id: input.gymId },
    update: { name: input.name },
    create: {
      id: input.gymId,
      name: input.name,
      ...(input.registrationToken
        ? { registrationToken: input.registrationToken }
        : {}),
    },
  });
}

/**
 * Ensures a Postgres `User` row exists for ledger FK (`LedgerTransaction.createdById`).
 * Idempotent: returns an existing user matched by id or email without changing IDs.
 */
export async function ensurePostgresStaffUser(
  prisma: PrismaClient,
  input: PostgresStaffUserMirrorInput,
) {
  const byId = await prisma.user.findUnique({ where: { id: input.id } });
  if (byId) return { user: byId, created: false as const };

  const byEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (byEmail) {
    return {
      user: byEmail,
      created: false as const,
      idMismatch: byEmail.id !== input.id,
    };
  }

  const user = await prisma.user.create({
    data: {
      id: input.id,
      gymId: input.gymId,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
    },
  });
  return { user, created: true as const };
}

/** Mirror Firestore tenant + owner rows needed for Prisma manual ledger FKs. */
export async function mirrorTenantStaffToPostgres(
  prisma: PrismaClient,
  params: {
    gym: PostgresGymMirrorInput;
    owner: PostgresStaffUserMirrorInput;
  },
) {
  await ensurePostgresGym(prisma, params.gym);
  return ensurePostgresStaffUser(prisma, params.owner);
}
