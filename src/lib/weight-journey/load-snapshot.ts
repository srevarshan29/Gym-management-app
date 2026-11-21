import { getRepositories } from "@/lib/firestore";
import type { FirestoreContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { MemberWeightMeasurementDoc } from "@/lib/firestore/types";
import {
  deriveWeightJourney,
  type WeightJourneyDerived,
} from "@/lib/weight-journey/progress";

export type WeightJourneyHistoryRow = {
  id: string;
  weightKg: number;
  recordedAt: Date;
};

export type WeightJourneySnapshot = WeightJourneyDerived & {
  history: WeightJourneyHistoryRow[];
  /** Stored trailhead override; null = earliest logged measurement. */
  weightJourneyStartKg: number | null;
};

function mapHistory(
  rows: DocWithId<MemberWeightMeasurementDoc>[],
): WeightJourneyHistoryRow[] {
  return rows.map((row) => ({
    id: row.id,
    weightKg: row.weightKg,
    recordedAt: row.recordedAt.toDate(),
  }));
}

export async function loadWeightJourneySnapshot(
  ctx: FirestoreContext,
  gymId: string,
  memberId: string,
): Promise<WeightJourneySnapshot> {
  const { memberWeightMeasurements, memberPortalDashboardState } =
    getRepositories();

  const [rows, dashboardState] = await Promise.all([
    memberWeightMeasurements.listForMember(ctx, gymId, memberId),
    memberPortalDashboardState.getForMember(ctx, gymId, memberId),
  ]);

  const targetKg = dashboardState?.weightJourneyTargetKg ?? null;
  const weightJourneyStartKg = dashboardState?.weightJourneyStartKg ?? null;
  const derived = deriveWeightJourney(
    rows.map((r) => ({
      weightKg: r.weightKg,
      recordedAtMs: r.recordedAt.toMillis(),
    })),
    targetKg,
    weightJourneyStartKg,
  );

  return {
    ...derived,
    weightJourneyStartKg,
    history: mapHistory(rows).sort(
      (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
    ),
  };
}
