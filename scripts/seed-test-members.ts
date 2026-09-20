/**
 * Seed fake members + payments for pagination testing (Firestore only).
 *
 * Writes ONLY to a single gym you explicitly target — never all gyms.
 *
 * Usage:
 *   npm run db:seed:test-members -- --confirm
 *
 * Or directly:
 *   npx tsx --env-file=.env scripts/seed-test-members.ts --confirm
 *
 * Target gym (pick one):
 *   --gym-id=<id>              Explicit gym document id (safest)
 *   SEED_TEST_GYM_ID=<id>      Same via env
 *   --owner-email=<email>      Resolve gym from staff owner email
 *   SEED_OWNER_EMAIL=<email>   Same via env (matches seed-firestore owner)
 *
 * Options:
 *   --count=60                 Number of test members (default 60)
 *   --confirm                  Required — prevents accidental runs
 */
import { createMemberWithSubscription } from "../src/lib/firestore/billing/operations";
import { getRepositories, platformContext } from "../src/lib/firestore";
import { EXPIRING_SOON_DAYS } from "../src/lib/subscription";
import type { MemberGender, PaymentMethod } from "../src/lib/firestore/types";

const TEST_MEMBER_PREFIX = "Test Member";
const TEST_EMAIL_DOMAIN = "pagination.test";
const TEST_PHONE_PREFIX = "999900"; // clearly fake — 9999… test range
const DEFAULT_COUNT = 60;

type SubscriptionBucket = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";

function parseArgs(argv: string[]) {
  const flags = new Map<string, string | true>();
  for (const arg of argv) {
    if (arg === "--confirm") {
      flags.set("confirm", true);
      continue;
    }
    const eq = arg.indexOf("=");
    if (arg.startsWith("--") && eq > 2) {
      flags.set(arg.slice(2, eq), arg.slice(eq + 1));
    }
  }
  return flags;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function subscriptionWindow(
  bucket: SubscriptionBucket,
  now: Date,
): { startDate: Date; endDate: Date } {
  const today = startOfDay(now);

  switch (bucket) {
    case "ACTIVE": {
      const endDate = addDays(today, EXPIRING_SOON_DAYS + 25);
      return { startDate: addDays(endDate, -30), endDate };
    }
    case "EXPIRING_SOON": {
      const endDate = addDays(today, 3);
      return { startDate: addDays(endDate, -30), endDate };
    }
    case "EXPIRED": {
      const endDate = addDays(today, -10);
      return { startDate: addDays(endDate, -30), endDate };
    }
  }
}

function bucketForIndex(index: number): SubscriptionBucket {
  const mod = index % 3;
  if (mod === 0) return "ACTIVE";
  if (mod === 1) return "EXPIRING_SOON";
  return "EXPIRED";
}

const GENDERS: MemberGender[] = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"];
const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "UPI", "CARD", "BANK_TRANSFER"];

async function resolveTargetGymId(flags: Map<string, string | true>): Promise<string> {
  const gymIdFromFlag = flags.get("gym-id");
  if (typeof gymIdFromFlag === "string" && gymIdFromFlag.trim()) {
    return gymIdFromFlag.trim();
  }

  const gymIdFromEnv = process.env.SEED_TEST_GYM_ID?.trim();
  if (gymIdFromEnv) return gymIdFromEnv;

  const ownerEmailFlag = flags.get("owner-email");
  const ownerEmail =
    (typeof ownerEmailFlag === "string" ? ownerEmailFlag : undefined) ??
    process.env.SEED_OWNER_EMAIL?.trim();

  if (ownerEmail) {
    const { users } = getRepositories();
    const owner = await users.findByEmail(platformContext, ownerEmail);
    if (!owner?.gymId) {
      throw new Error(
        `No gym found for owner email "${ownerEmail}". Use --gym-id or SEED_TEST_GYM_ID instead.`,
      );
    }
    return owner.gymId;
  }

  throw new Error(
    "Target gym required. Pass --gym-id=<id>, set SEED_TEST_GYM_ID, or pass --owner-email / SEED_OWNER_EMAIL.",
  );
}

async function resolvePackage(gymId: string) {
  const { packages } = getRepositories();
  const active = await packages.listActive(platformContext, gymId);
  if (active.length > 0) {
    const pkg = active[0]!;
    return {
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
    };
  }

  console.log("No active packages found — creating a test package for this gym only.");
  const created = await packages.create(platformContext, gymId, {
    name: "Pagination Test Monthly",
    price: 1500,
    durationValue: 1,
    durationUnit: "MONTHS",
    isActive: true,
  });
  return {
    id: created.id,
    name: created.name,
    price: created.price,
  };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (!flags.has("confirm")) {
    console.error(
      "Refusing to run without --confirm. This script writes test data to one gym in Firestore.",
    );
    process.exit(1);
  }

  const count = Math.max(
    1,
    Number(typeof flags.get("count") === "string" ? flags.get("count") : DEFAULT_COUNT) ||
      DEFAULT_COUNT,
  );

  const gymId = await resolveTargetGymId(flags);
  const { gyms, users, gymProfiles } = getRepositories();

  const [gym, profile, owner] = await Promise.all([
    gyms.getById(platformContext, gymId),
    gymProfiles.getByGymId(platformContext, gymId),
    users.findOwnerByGym(platformContext, gymId),
  ]);

  if (!gym) {
    throw new Error(`Gym not found: ${gymId}`);
  }
  if (!owner) {
    throw new Error(`No OWNER staff user found for gym ${gymId}. Cannot set createdById.`);
  }

  const gymLabel = profile?.name ?? gym.name;
  console.log("Target gym (only gym that will be written to):");
  console.log(`  name: ${gymLabel}`);
  console.log(`  id:   ${gymId}`);
  console.log(`  owner: ${owner.name} <${owner.email}>`);
  console.log(`Creating ${count} test members with one payment each…`);

  const pkg = await resolvePackage(gymId);
  console.log(`Using package: ${pkg.name} (₹${pkg.price})`);

  const now = new Date();
  let created = 0;
  const bucketCounts: Record<SubscriptionBucket, number> = {
    ACTIVE: 0,
    EXPIRING_SOON: 0,
    EXPIRED: 0,
  };

  for (let i = 1; i <= count; i += 1) {
    const bucket = bucketForIndex(i);
    bucketCounts[bucket] += 1;
    const { startDate, endDate } = subscriptionWindow(bucket, now);
    const indexLabel = String(i).padStart(3, "0");
    const name = `${TEST_MEMBER_PREFIX} ${indexLabel}`;
    const phone = `${TEST_PHONE_PREFIX}${String(i).padStart(4, "0")}`;
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@${TEST_EMAIL_DOMAIN}`;

    await createMemberWithSubscription({
      gymId,
      name,
      phone,
      email,
      gender: GENDERS[i % GENDERS.length]!,
      notes: "Pagination test seed — safe to delete",
      isPt: false,
      trainerId: null,
      fitnessGoal: null,
      ageYears: null,
      heightCm: null,
      weightKg: null,
      membershipPolicyAgreedText: null,
      membershipPolicyAgreedAt: null,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      startDate,
      endDate,
      createdById: owner.id,
      createdByName: owner.name,
      logPayment: true,
      paymentAmount: pkg.price,
      paymentMethod: PAYMENT_METHODS[i % PAYMENT_METHODS.length]!,
    });

    created += 1;
    if (created % 10 === 0 || created === count) {
      console.log(`  … ${created}/${count} members created`);
    }
  }

  console.log("\nDone.");
  console.log(`  members created: ${created}`);
  console.log(`  payments created: ${created} (one full payment per member)`);
  console.log("  status mix:");
  console.log(`    active:         ${bucketCounts.ACTIVE}`);
  console.log(`    expiring soon:  ${bucketCounts.EXPIRING_SOON}`);
  console.log(`    expired:        ${bucketCounts.EXPIRED}`);
  console.log(`\nAll data was written only to gym "${gymLabel}" (${gymId}).`);
  console.log("Open /members and /payments (paid tab) to test pagination.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
