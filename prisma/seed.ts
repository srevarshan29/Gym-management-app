import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  DEFAULT_SEED_GYM_ID,
  DEFAULT_SEED_OWNER_USER_ID,
} from "../src/lib/seed/default-tenant";
import {
  createSeedPrismaClient,
  ensurePostgresGym,
  ensurePostgresStaffUser,
} from "../src/lib/seed/postgres-tenant-mirror";

/** Seed runs as postgres via DIRECT_URL — bypasses RLS for bootstrap data. */
const prisma = createSeedPrismaClient();

async function main() {
  const gymName = process.env.SEED_GYM_NAME ?? "Gym #1";
  await ensurePostgresGym(prisma, {
    gymId: DEFAULT_SEED_GYM_ID,
    name: gymName,
  });

  const ownerName = process.env.SEED_OWNER_NAME ?? "Gym Owner";
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@gym.test";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingOwner) {
    console.log(`Owner account already exists: ${ownerEmail}`);
    if (existingOwner.id !== DEFAULT_SEED_OWNER_USER_ID) {
      console.warn(
        `[seed] Postgres owner id (${existingOwner.id}) differs from Firestore bootstrap id (${DEFAULT_SEED_OWNER_USER_ID}). ` +
          "Re-run npm run db:seed:firestore to mirror the Firestore owner, or manual ledger createdById may fail.",
      );
    }
  } else {
    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    await ensurePostgresStaffUser(prisma, {
      id: DEFAULT_SEED_OWNER_USER_ID,
      gymId: DEFAULT_SEED_GYM_ID,
      name: ownerName,
      email: ownerEmail,
      passwordHash,
      role: Role.OWNER,
    });
    console.log("Seeded initial owner account (Gym #1):");
    console.log(`  email:    ${ownerEmail}`);
    console.log(`  password: ${ownerPassword}`);
  }

  const superAdminName = process.env.SEED_SUPERADMIN_NAME ?? "Platform Admin";
  const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL ?? "admin@platform.test";
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? "ChangeMeAdmin123!";

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });
  if (existingSuperAdmin) {
    console.log(`Super-admin account already exists: ${superAdminEmail}`);
    return;
  }

  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 10);
  await prisma.user.create({
    data: {
      name: superAdminName,
      email: superAdminEmail,
      passwordHash: superAdminPasswordHash,
      role: Role.SUPER_ADMIN,
      gymId: null,
    },
  });

  console.log("Seeded super-admin account:");
  console.log(`  email:    ${superAdminEmail}`);
  console.log(`  password: ${superAdminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
