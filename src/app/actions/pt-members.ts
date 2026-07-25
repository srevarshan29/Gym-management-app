"use server";

import { revalidatePath } from "next/cache";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { validateTrainerForGym } from "@/lib/staff";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

export async function updatePtTrainer(
  memberId: string,
  trainerId: string | null,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to update PT assignments.");
  }

  if (trainerId) {
    const valid = await validateTrainerForGym(user.gymId, trainerId);
    if (!valid) {
      return actionError("Selected trainer is not valid for this gym.");
    }
  }

  const result = await withTenant(user.gymId, (tx) =>
    tx.member.updateMany({
      where: { id: memberId, gymId: user.gymId, isPt: true },
      data: { trainerId },
    }),
  );

  if (result.count === 0) {
    return actionError("PT member not found.");
  }

  revalidatePath("/members/pt");
  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  return actionOk("Trainer updated.");
}
