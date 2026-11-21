import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { MemberDoc } from "@/lib/firestore/types";

export {
  PERSONAL_WORKOUTS_LOCKED_MESSAGE,
  PersonalWorkoutsAccessError,
  assertPersonalWorkoutsEnabled,
  isPersonalWorkoutsEnabled,
} from "@/lib/member-portal/personal-workouts-policy";

import {
  assertPersonalWorkoutsEnabled,
  PersonalWorkoutsAccessError,
} from "@/lib/member-portal/personal-workouts-policy";

export async function requireMemberPersonalWorkoutsAccess(
  ctx: MemberContext,
): Promise<DocWithId<MemberDoc>> {
  const { members } = getRepositories();
  const member = await members.findByIdAndGym(ctx, ctx.memberId, ctx.gymId);
  if (!member) {
    throw new PersonalWorkoutsAccessError("Member not found.");
  }
  assertPersonalWorkoutsEnabled(member);
  return member;
}
