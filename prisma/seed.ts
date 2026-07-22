import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

/** Seed runs as postgres via DIRECT_URL — bypasses RLS for bootstrap data. */
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
  },
});

const DEFAULT_GYM_ID = "gym_default_0000000001";

async function main() {
  const gym = await prisma.gym.upsert({
    where: { id: DEFAULT_GYM_ID },
    update: {},
    create: { id: DEFAULT_GYM_ID, name: "Gym #1" },
  });

  const ownerName = process.env.SEED_OWNER_NAME ?? "Gym Owner";
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@gym.test";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existingOwner) {
    console.log(`Owner account already exists: ${ownerEmail}`);
  } else {
    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    await prisma.user.create({
      data: {
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: Role.OWNER,
        gymId: gym.id,
      },
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
