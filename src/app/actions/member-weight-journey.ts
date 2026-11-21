"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import type { MemberContext } from "@/lib/firestore/context";
import { getRepositories } from "@/lib/firestore";
import { assertValidWeightKg } from "@/lib/weight-journey/progress";
import { loadWeightJourneySnapshot } from "@/lib/weight-journey/load-snapshot";
import { requireMember } from "@/lib/member-session";

function memberContext(session: {
  gymId: string;
  memberId: string;
}): MemberContext {
  return {
    kind: "member",
    gymId: session.gymId,
    memberId: session.memberId,
  };
}

const logWeightSchema = z.object({
  weightKg: z.coerce.number(),
});

const targetSchema = z.object({
  targetKg: z.coerce.number(),
});

const startSchema = z.object({
  startKg: z.number().nullable(),
});

export async function logMemberWeightMeasurementAction(
  input: z.infer<typeof logWeightSchema>,
): Promise<ActionResult<void>> {
  try {
    const member = await requireMember();
    const parsed = logWeightSchema.parse(input);
    const weightKg = assertValidWeightKg(parsed.weightKg);
    const ctx = memberContext(member);
    const { memberWeightMeasurements } = getRepositories();

    await memberWeightMeasurements.addMeasurement(
      ctx,
      member.gymId,
      member.memberId,
      weightKg,
    );

    revalidatePath("/member/weight-journey");
    revalidatePath("/member/profile");
    return actionOk(undefined);
  } catch (error) {
    console.error("[weight-journey] log", error);
    return actionError(
      error instanceof Error ? error.message : "Could not log weight.",
    );
  }
}

export async function setMemberWeightJourneyStartAction(
  input: z.infer<typeof startSchema>,
): Promise<ActionResult<void>> {
  try {
    const member = await requireMember();
    const parsed = startSchema.parse(input);
    const ctx = memberContext(member);
    const { memberPortalDashboardState } = getRepositories();

    const startKg =
      parsed.startKg === null ? null : assertValidWeightKg(parsed.startKg);

    await memberPortalDashboardState.mergeForMember(
      ctx,
      member.gymId,
      member.memberId,
      { weightJourneyStartKg: startKg },
    );

    revalidatePath("/member/weight-journey");
    return actionOk(undefined);
  } catch (error) {
    console.error("[weight-journey] start", error);
    return actionError(
      error instanceof Error
        ? error.message
        : "Could not save starting weight.",
    );
  }
}

export async function setMemberWeightJourneyTargetAction(
  input: z.infer<typeof targetSchema>,
): Promise<ActionResult<void>> {
  try {
    const member = await requireMember();
    const parsed = targetSchema.parse(input);
    const targetKg = assertValidWeightKg(parsed.targetKg);
    const ctx = memberContext(member);
    const { memberPortalDashboardState } = getRepositories();

    await memberPortalDashboardState.mergeForMember(
      ctx,
      member.gymId,
      member.memberId,
      { weightJourneyTargetKg: targetKg },
    );

    revalidatePath("/member/weight-journey");
    return actionOk(undefined);
  } catch (error) {
    console.error("[weight-journey] target", error);
    return actionError(
      error instanceof Error ? error.message : "Could not save target weight.",
    );
  }
}

export type WeightJourneyActionPayload = Awaited<
  ReturnType<typeof loadWeightJourneySnapshot>
>;

export async function loadMemberWeightJourneyForSession(): Promise<WeightJourneyActionPayload | null> {
  try {
    const member = await requireMember();
    const ctx = memberContext(member);
    return loadWeightJourneySnapshot(ctx, member.gymId, member.memberId);
  } catch {
    return null;
  }
}
