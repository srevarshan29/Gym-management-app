import { attendanceDateKey } from "@/lib/attendance/date-key";
import type { FirestoreContext } from "@/lib/firestore/context";
import { getRepositories } from "@/lib/firestore";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { WorkoutSessionDoc } from "@/lib/firestore/types";
import { countLoggedSetsInSession } from "@/lib/workout-tracking/session-logged-sets";

export function isQualifyingCompletedSession(
  session: Pick<WorkoutSessionDoc, "exercises" | "completedAt" | "status">,
  dateKey: string,
): boolean {
  if (session.status !== "COMPLETED" || !session.completedAt) return false;
  if (attendanceDateKey(session.completedAt.toDate()) !== dateKey) return false;
  return countLoggedSetsInSession(session) > 0;
}

export async function findTodayQualifyingCompletedSession(
  ctx: FirestoreContext,
  gymId: string,
  memberId: string,
  dateKey: string = attendanceDateKey(),
): Promise<DocWithId<WorkoutSessionDoc> | null> {
  const { workoutSessions } = getRepositories();
  const recent = await workoutSessions.listCompletedForMember(
    ctx,
    gymId,
    memberId,
    30,
  );
  for (const session of recent) {
    if (isQualifyingCompletedSession(session, dateKey)) {
      return session;
    }
  }
  return null;
}
