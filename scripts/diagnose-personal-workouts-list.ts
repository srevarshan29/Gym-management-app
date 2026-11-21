/**
 * Usage: node --env-file=.env --import tsx scripts/diagnose-personal-workouts-list.ts
 */
import { getFirestoreDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { MemberPersonalWorkoutsRepository } from "@/lib/firestore/repositories/member-personal-workouts";

async function main() {
  const db = getFirestoreDb();
  const col = db.collection(COLLECTIONS.memberPersonalWorkouts);
  const count = await col.count().get();
  console.log("memberPersonalWorkouts count:", count.data().count);

  const sample = await col.limit(3).get();
  for (const doc of sample.docs) {
    const d = doc.data();
    console.log({
      id: doc.id,
      gymId: d.gymId,
      memberId: d.memberId,
      name: d.name,
      exercisesLen: Array.isArray(d.exercises) ? d.exercises.length : "NOT_ARRAY",
      updatedAt: d.updatedAt ? "present" : "MISSING",
    });
  }

  if (sample.empty) {
    console.log("No docs to test listForMember query shape.");
    return;
  }

  const first = sample.docs[0]!.data();
  const ctx = {
    kind: "member" as const,
    gymId: first.gymId as string,
    memberId: first.memberId as string,
  };
  const repo = new MemberPersonalWorkoutsRepository(db);
  try {
    const rows = await repo.listForMember(ctx, ctx.gymId, ctx.memberId);
    console.log("listForMember ok:", rows.length);
  } catch (error) {
    console.error("listForMember FAILED:", error);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
