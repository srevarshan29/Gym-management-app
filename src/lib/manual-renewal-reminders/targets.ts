import { getRepositories, platformContext } from "@/lib/firestore";
import {
  filterExpiredMemberships,
  filterUpcomingRenewals,
} from "@/lib/queries";

import type { ManualRenewalReminderVariant } from "./types";

function filterByQuery<
  T extends { name: string; packageName: string },
>(rows: T[], q?: string): T[] {
  const query = q?.trim().toLowerCase() ?? "";
  if (!query) return rows;
  return rows.filter(
    (r) =>
      r.name.toLowerCase().includes(query) ||
      r.packageName.toLowerCase().includes(query),
  );
}

export type ManualRenewalReminderTarget = {
  memberId: string;
  endDate: Date;
  email: string | null;
};

/** Server-side recipient list for bulk manual sends (same bucket + search as renewal pages). */
export async function listManualRenewalReminderTargets(
  gymId: string,
  variant: ManualRenewalReminderVariant,
  q?: string,
): Promise<ManualRenewalReminderTarget[]> {
  const { members } = getRepositories();
  const all = await members.listAllWithStatus(platformContext, gymId);
  const bucket =
    variant === "expired"
      ? filterExpiredMemberships(all)
      : filterUpcomingRenewals(all);

  return filterByQuery(bucket, q).map((row) => ({
    memberId: row.id,
    endDate: row.endDate,
    email: row.email,
  }));
}
