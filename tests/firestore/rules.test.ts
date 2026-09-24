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
  deleteDoc,
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

function customExerciseDoc(gymId: string, overrides: Record<string, unknown> = {}) {
  return {
    gymId,
    name: "Push Up",
    nameLower: "push up",
    muscleGroup: "CHEST",
    defaultSets: 3,
    defaultReps: "12",
    defaultTempo: null,
    defaultRestSeconds: 60,
    trackingType: "BODYWEIGHT",
    isSeeded: false,
    exerciseSource: "CUSTOM",
    catalogId: null,
    importedCatalogVersion: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function seedCustomExercise(
  id: string,
  gymId: string,
  overrides: Record<string, unknown> = {},
) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(
      doc(ctx.firestore(), `customExercises/${id}`),
      customExerciseDoc(gymId, overrides),
    );
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

  it("denies all client access to exerciseCatalog", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "exerciseCatalog/bench-press"), {
        catalogId: "bench-press",
        name: "Bench Press",
        nameLower: "bench press",
        muscleGroup: "CHEST",
        isActive: true,
      });
    });

    const owner = staffContext("owner-a", "gym-a", "OWNER");
    const admin = superAdminContext("super-1");
    const member = memberContext("mem-1", "gym-a", "m1");

    await assertFails(
      getDoc(doc(owner.firestore(), "exerciseCatalog/bench-press")),
    );
    await assertFails(
      getDoc(doc(admin.firestore(), "exerciseCatalog/bench-press")),
    );
    await assertFails(
      getDoc(doc(member.firestore(), "exerciseCatalog/bench-press")),
    );
  });

  it("denies client writes to exerciseCatalog", async () => {
    const owner = staffContext("owner-a", "gym-a", "OWNER");
    await assertFails(
      setDoc(doc(owner.firestore(), "exerciseCatalog/new-exercise"), {
        catalogId: "new-exercise",
        name: "New Exercise",
        nameLower: "new exercise",
        muscleGroup: "CHEST",
        isActive: true,
      }),
    );
  });

  it("denies client writes to catalogSyncMeta", async () => {
    const owner = staffContext("owner-a", "gym-a", "OWNER");
    await assertFails(
      setDoc(doc(owner.firestore(), "catalogSyncMeta/active"), {
        catalogVersion: "test",
        exerciseCount: 1,
        jsonSha256: "a".repeat(64),
        mediaObjectCount: 0,
        syncedAt: new Date().toISOString(),
        status: "complete",
        lastRun: {
          dryRun: false,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          created: 1,
          updated: 0,
          deactivated: 0,
          unchanged: 0,
          failures: [],
          warnings: [],
          scriptVersion: "2b-2",
        },
      }),
    );
  });

  it("denies client writes to catalogImportLocks", async () => {
    const owner = staffContext("owner-a", "gym-a", "OWNER");
    await assertFails(
      setDoc(doc(owner.firestore(), "catalogImportLocks/gym-a_dev-push-up"), {
        gymId: "gym-a",
        catalogId: "dev-push-up",
        exerciseId: "ex-1",
      }),
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

  it("allows staff to read exercises in their own gym", async () => {
    await seedCustomExercise("ex-1", "gym-a");
    const staff = staffContext("staff-a", "gym-a", "STAFF");
    await assertSucceeds(getDoc(doc(staff.firestore(), "customExercises/ex-1")));
  });

  it("denies staff from reading another gym's exercises", async () => {
    await seedCustomExercise("ex-1", "gym-b");
    const staff = staffContext("staff-a", "gym-a", "STAFF");
    await assertFails(getDoc(doc(staff.firestore(), "customExercises/ex-1")));
  });

  it("allows members to read exercises in their own gym", async () => {
    await seedCustomExercise("ex-1", "gym-a");
    const member = memberContext("mem-1", "gym-a", "m1");
    await assertSucceeds(getDoc(doc(member.firestore(), "customExercises/ex-1")));
  });

  it("denies members from reading another gym's exercises", async () => {
    await seedCustomExercise("ex-1", "gym-b");
    const member = memberContext("mem-1", "gym-a", "m1");
    await assertFails(getDoc(doc(member.firestore(), "customExercises/ex-1")));
  });

  it("denies staff from directly creating customExercises", async () => {
    const staff = staffContext("staff-a", "gym-a", "STAFF");
    await assertFails(
      setDoc(doc(staff.firestore(), "customExercises/ex-new"), customExerciseDoc("gym-a")),
    );
  });

  it("denies owner from directly creating customExercises", async () => {
    const owner = staffContext("owner-a", "gym-a", "OWNER");
    await assertFails(
      setDoc(doc(owner.firestore(), "customExercises/ex-new"), customExerciseDoc("gym-a")),
    );
  });

  it("denies super-admin client SDK creates on customExercises", async () => {
    const admin = superAdminContext("super-1");
    await assertFails(
      setDoc(doc(admin.firestore(), "customExercises/ex-new"), customExerciseDoc("gym-a")),
    );
  });

  it("denies staff from directly updating customExercises", async () => {
    await seedCustomExercise("ex-1", "gym-a");
    const staff = staffContext("staff-a", "gym-a", "STAFF");
    await assertFails(
      updateDoc(doc(staff.firestore(), "customExercises/ex-1"), {
        name: "Tampered Name",
        updatedAt: new Date(),
      }),
    );
  });

  it("denies owner from directly updating protected exercise fields", async () => {
    await seedCustomExercise("ex-1", "gym-a", { isSeeded: true, exerciseSource: "SEEDED" });
    const owner = staffContext("owner-a", "gym-a", "OWNER");
    await assertFails(
      updateDoc(doc(owner.firestore(), "customExercises/ex-1"), {
        isSeeded: false,
        exerciseSource: "CUSTOM",
        updatedAt: new Date(),
      }),
    );
  });

  it("denies staff from directly deleting customExercises", async () => {
    await seedCustomExercise("ex-1", "gym-a");
    const staff = staffContext("staff-a", "gym-a", "STAFF");
    await assertFails(deleteDoc(doc(staff.firestore(), "customExercises/ex-1")));
  });

  it("denies owner from directly deleting customExercises", async () => {
    await seedCustomExercise("ex-1", "gym-a");
    const owner = staffContext("owner-a", "gym-a", "OWNER");
    await assertFails(deleteDoc(doc(owner.firestore(), "customExercises/ex-1")));
  });

  it("denies client writes even when payload gymId matches auth gym", async () => {
    const owner = staffContext("owner-a", "gym-a", "OWNER");
    await assertFails(
      setDoc(
        doc(owner.firestore(), "customExercises/ex-valid-looking"),
        customExerciseDoc("gym-a", {
          exerciseSource: "CATALOG",
          catalogId: "dev-push-up",
          media: {
            primaryImageUrl: null,
            secondaryImageUrl: null,
            thumbnailUrl: null,
          },
        }),
      ),
    );
  });
});
