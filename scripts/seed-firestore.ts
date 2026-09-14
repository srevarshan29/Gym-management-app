/**
 * Seed Firestore with a platform SUPER_ADMIN account (and optional demo gym).
 *
 * Usage:
 *   npx tsx scripts/seed-firestore.ts
 *
 * Env vars (optional):
 *   SEED_SUPERADMIN_EMAIL, SEED_SUPERADMIN_PASSWORD, SEED_SUPERADMIN_NAME
 *   SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, SEED_OWNER_NAME, SEED_GYM_NAME
 */
import bcrypt from "bcryptjs";

import { getRepositories, newDocId, platformContext } from "../src/lib/firestore";
import { DEFAULT_MEMBERSHIP_POLICY_TEXT } from "../src/lib/membership-policy";

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
    return;
  }

  const ownerName = process.env.SEED_OWNER_NAME ?? "Gym Owner";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";
  const gymName = process.env.SEED_GYM_NAME ?? "Gym #1";
  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const gymId = newDocId();

  await gyms.create(platformContext, {
    id: gymId,
    name: gymName,
    registrationToken: newDocId(),
  });

  await users.create(platformContext, {
    id: newDocId(),
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
