import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "gymdesk-rules-test";
const RULES_PATH = resolve(process.cwd(), "firestore.rules");

let testEnv: RulesTestEnvironment;

function staffContext(uid: string, gymId: string, role = "STAFF") {
  return testEnv.authenticatedContext(uid, { role, gymId });
}

function memberContext(uid: string, gymId: string, memberId: string) {
  return testEnv.authenticatedContext(uid, {
    role: "MEMBER",
    gymId,
    memberId,
  });
}

function superAdminContext(uid: string) {
  return testEnv.authenticatedContext(uid, { role: "SUPER_ADMIN" });
}

async function seedMember(
  id: string,
  gymId: string,
  overrides: Record<string, unknown> = {},
) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `members/${id}`), {
      gymId,
      name: "Test Member",
      memberNumber: 1,
      phone: "9999999999",
      ...overrides,
    });
  });
}

describe("Firestore security rules — tenant isolation", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, "utf8"),
        host: "127.0.0.1",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("denies unauthenticated reads on tenant data", async () => {
    await seedMember("m1", "gym-a");
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "members/m1")));
  });

  it("denies staff from reading another gym's members", async () => {
    await seedMember("m1", "gym-b");
    const staffA = staffContext("staff-a", "gym-a");
    await assertFails(getDoc(doc(staffA.firestore(), "members/m1")));
  });

  it("allows staff to read members in their own gym", async () => {
    await seedMember("m1", "gym-a");
    const staffA = staffContext("staff-a", "gym-a");
    await assertSucceeds(getDoc(doc(staffA.firestore(), "members/m1")));
  });

  it("allows super-admin to read any gym's members", async () => {
    await seedMember("m1", "gym-b");
    const admin = superAdminContext("super-1");
    await assertSucceeds(getDoc(doc(admin.firestore(), "members/m1")));
  });

  it("allows member to read only their own member doc", async () => {
    await seedMember("m1", "gym-a");
    await seedMember("m2", "gym-a");
    const member = memberContext("mem-1", "gym-a", "m1");
    await assertSucceeds(getDoc(doc(member.firestore(), "members/m1")));
    await assertFails(getDoc(doc(member.firestore(), "members/m2")));
  });

  it("allows member to update allowed profile fields only", async () => {
    await seedMember("m1", "gym-a", {
      ageYears: null,
      heightCm: null,
      weightKg: null,
      fitnessGoal: null,
      photoUrl: null,
      updatedAt: new Date(),
    });
    const member = memberContext("mem-1", "gym-a", "m1");
    await assertSucceeds(
      updateDoc(doc(member.firestore(), "members/m1"), {
        ageYears: 25,
        updatedAt: new Date(),
      }),
    );
  });

  it("denies member from updating staff-controlled fields", async () => {
    await seedMember("m1", "gym-a");
    const member = memberContext("mem-1", "gym-a", "m1");
    await assertFails(
      updateDoc(doc(member.firestore(), "members/m1"), { name: "Hacked Name" }),
    );
  });

  it("denies all client access to staffLoginThrottles", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "staffLoginThrottles/ip-test"), {
        failCount: 1,
      });
    });
    const staff = staffContext("staff-a", "gym-a");
    const admin = superAdminContext("super-1");
    await assertFails(
      getDoc(doc(staff.firestore(), "staffLoginThrottles/ip-test")),
    );
    await assertFails(
      getDoc(doc(admin.firestore(), "staffLoginThrottles/ip-test")),
    );
  });

  it("denies receipt updates (immutable snapshots)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "receipts/r1"), {
        gymId: "gym-a",
        memberId: "m1",
        number: 1,
        paymentId: "p1",
        amount: 100,
        method: "CASH",
        paidAt: new Date(),
        createdAt: new Date(),
        gymName: "Gym",
        memberName: "Test",
        memberPhone: "999",
      });
    });
    const owner = staffContext("owner-a", "gym-a", "OWNER");
    await assertFails(
      updateDoc(doc(owner.firestore(), "receipts/r1"), { amount: 0 }),
    );
  });

  it("denies cross-gym payment reads for members", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "payments/p1"), {
        gymId: "gym-b",
        memberId: "m-other",
        amount: 500,
        method: "CASH",
        paidAt: new Date(),
        createdAt: new Date(),
      });
    });
    const member = memberContext("mem-1", "gym-a", "m1");
    await assertFails(getDoc(doc(member.firestore(), "payments/p1")));
  });
});
