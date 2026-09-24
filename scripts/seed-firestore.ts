/**
 * Seed Firestore with a platform SUPER_ADMIN account (and optional demo gym).
 *
 * Usage:
 *   npm run db:seed:firestore
 *
 * Env vars (optional):
 *   SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD, SEED_SUPERADMIN_NAME
 *   SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, SEED_OWNER_NAME, SEED_GYM_NAME
 */
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

import {
  DEFAULT_SEED_GYM_ID,
  DEFAULT_SEED_OWNER_USER_ID,
  DEFAULT_SEED_REGISTRATION_TOKEN,
} from "../src/lib/seed/default-tenant";
import {
  createSeedPrismaClient,
  mirrorTenantStaffToPostgres,
} from "../src/lib/seed/postgres-tenant-mirror";
import { getRepositories, newDocId, platformContext } from "../src/lib/firestore";
import { DEFAULT_MEMBERSHIP_POLICY_TEXT } from "../src/lib/membership-policy";

async function mirrorExistingOwnerToPostgres(
  owner: {
    id: string;
    gymId: string | null;
    name: string;
    email: string;
    passwordHash: string;
    role: string;
  },
) {
  if (!owner.gymId) return;

  const prisma = createSeedPrismaClient();
  try {
    const { gyms } = getRepositories();
    const gym = await gyms.getById(platformContext, owner.gymId);
    const gymName = gym?.name ?? process.env.SEED_GYM_NAME ?? "Gym #1";
    const result = await mirrorTenantStaffToPostgres(prisma, {
      gym: {
        gymId: owner.gymId,
        name: gymName,
        registrationToken: gym?.registrationToken,
      },
      owner: {
        id: owner.id,
        gymId: owner.gymId,
        name: owner.name,
        email: owner.email,
        passwordHash: owner.passwordHash,
        role: owner.role as Role,
      },
    });
    if ("idMismatch" in result && result.idMismatch) {
      console.warn(
        `[seed:firestore] Postgres user for ${owner.email} has a different id than Firestore (${owner.id}). ` +
          "Manual ledger createdById may fail until IDs are aligned.",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const { users, gyms, gymProfiles } = getRepositories();

  const superAdminName = process.env.SEED_SUPERADMIN_NAME ?? "Platform Admin";
  const superAdminEmail =
    process.env.SEED_SUPERADMIN_EMAIL ?? "admin@platform.test";
  const superAdminPassword =
    process.env.SEED_SUPERADMIN_PASSWORD ?? "ChangeMeAdmin123!";

  const existingSuperAdmin = await users.findByEmail(
    platformContext,
    superAdminEmail,
  );
  if (existingSuperAdmin) {
    console.log(`Super-admin account already exists: ${superAdminEmail}`);
  } else {
    const passwordHash = await bcrypt.hash(superAdminPassword, 10);
    await users.create(platformContext, {
      id: newDocId(),
      gymId: null,
      name: superAdminName,
      email: superAdminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
    });
    console.log("Seeded super-admin account:");
    console.log(`  email:    ${superAdminEmail}`);
    console.log(`  password: ${superAdminPassword}`);
  }

  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  if (!ownerEmail) {
    console.log("No SEED_OWNER_EMAIL set — skipping demo gym.");
    return;
  }

  const existingOwner = await users.findByEmail(platformContext, ownerEmail);
  if (existingOwner) {
    console.log(`Owner account already exists: ${ownerEmail}`);
    await mirrorExistingOwnerToPostgres(existingOwner);
    return;
  }

  const ownerName = process.env.SEED_OWNER_NAME ?? "Gym Owner";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";
  const gymName = process.env.SEED_GYM_NAME ?? "Gym #1";
  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const gymId = DEFAULT_SEED_GYM_ID;
  const ownerUserId = DEFAULT_SEED_OWNER_USER_ID;

  const prisma = createSeedPrismaClient();
  try {
    await mirrorTenantStaffToPostgres(prisma, {
      gym: {
        gymId,
        name: gymName,
        registrationToken: DEFAULT_SEED_REGISTRATION_TOKEN,
      },
      owner: {
        id: ownerUserId,
        gymId,
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: Role.OWNER,
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  const existingGym = await gyms.getById(platformContext, gymId);
  if (!existingGym) {
    await gyms.create(platformContext, {
      id: gymId,
      name: gymName,
      registrationToken: DEFAULT_SEED_REGISTRATION_TOKEN,
    });
  }

  await users.create(platformContext, {
    id: ownerUserId,
    gymId,
    name: ownerName,
    email: ownerEmail,
    passwordHash,
    role: "OWNER",
  });

  await gymProfiles.create(platformContext, gymId, {
    name: gymName,
    membershipPolicyText: DEFAULT_MEMBERSHIP_POLICY_TEXT,
  });

  console.log("Seeded demo gym + owner:");
  console.log(`  gym:      ${gymName} (${gymId})`);
  console.log(`  email:    ${ownerEmail}`);
  console.log(`  password: ${ownerPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
