/**
 * Temporary perf-test data: provisions a throwaway gym with 120+ members,
 * subscriptions, and payments so Members/Payments pages can be exercised at
 * realistic volume. Run with --cleanup afterward to remove everything.
 *
 *   npx tsx scripts/seed-perf-test.ts
 *   npx tsx scripts/seed-perf-test.ts --cleanup
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const GYM_NAME = "PERF_TEST_GYM";
const OWNER_EMAIL = "perf-test-owner@gym.test";
const OWNER_PASSWORD = "PerfTest123!";
const MEMBER_COUNT = 125;

async function seed() {
  const existingUser = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (existingUser) {
    console.log(`Perf-test owner already exists. Run with --cleanup first.`);
    return;
  }

  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 10);

  const gym = await prisma.gym.create({ data: { name: GYM_NAME } });
  const owner = await prisma.user.create({
    data: {
      gymId: gym.id,
      name: "Perf Test Owner",
      email: OWNER_EMAIL,
      passwordHash,
      role: "OWNER",
    },
  });
  await prisma.gymProfile.create({ data: { gymId: gym.id, name: GYM_NAME } });
  const pkg = await prisma.package.create({
    data: {
      gymId: gym.id,
      name: "Monthly",
      price: 1500,
      durationValue: 1,
      durationUnit: "MONTHS",
    },
  });

  const now = Date.now();
  for (let i = 1; i <= MEMBER_COUNT; i++) {
    const member = await prisma.member.create({
      data: {
        gymId: gym.id,
        memberNumber: i,
        name: `Perf Member ${String(i).padStart(3, "0")}`,
        phone: `90000${String(i).padStart(5, "0")}`,
        email: i % 3 === 0 ? `perf${i}@test.local` : null,
      },
    });
    const startDate = new Date(now - i * 86400000);
    const endDate = new Date(startDate.getTime() + 30 * 86400000);
    const sub = await prisma.subscription.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        packageId: pkg.id,
        startDate,
        endDate,
        priceAtPurchase: pkg.price,
        createdById: owner.id,
      },
    });
    await prisma.payment.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        subscriptionId: sub.id,
        amount: pkg.price,
        method: "CASH",
        paidAt: startDate,
        recordedById: owner.id,
      },
    });
    if (i % 25 === 0) console.log(`  seeded ${i}/${MEMBER_COUNT} members`);
  }

  await prisma.gym.update({
    where: { id: gym.id },
    data: { memberSeq: MEMBER_COUNT },
  });

  const [members, payments] = await Promise.all([
    prisma.member.count({ where: { gymId: gym.id } }),
    prisma.payment.count({ where: { gymId: gym.id } }),
  ]);

  console.log("Perf-test gym provisioned:");
  console.log(`  gymId:    ${gym.id}`);
  console.log(`  email:    ${OWNER_EMAIL}`);
  console.log(`  password: ${OWNER_PASSWORD}`);
  console.log(`  members:  ${members}`);
  console.log(`  payments: ${payments}`);
}

async function cleanup() {
  const user = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
    select: { gymId: true },
  });
  if (!user?.gymId) {
    console.log("No perf-test gym found — nothing to clean up.");
    return;
  }
  await prisma.gym.delete({ where: { id: user.gymId } });
  console.log(`Deleted perf-test gym ${user.gymId} and all related data.`);
}

const cleanupFlag = process.argv.includes("--cleanup");

(cleanupFlag ? cleanup() : seed())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
