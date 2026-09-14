import { cache } from "react";

import { redirect } from "next/navigation";

import { memberAuth } from "@/member-auth";
import {
  getRepositories,
  platformContext,
  type MemberContext,
} from "@/lib/firestore";

export type MemberSession = {
  memberId: string;
  gymId: string;
  name: string;
  memberNumber: number;
};

const resolveCurrentMember = cache(async (): Promise<MemberSession | null> => {
  const session = await memberAuth();
  if (session?.user?.kind !== "member" || !session.user.memberId || !session.user.gymId) {
    return null;
  }

  const tenantGymId = session.user.gymId;
  const memberId = session.user.memberId;
  const ctx: MemberContext = {
    kind: "member",
    memberId,
    gymId: tenantGymId,
  };

  const { members } = getRepositories();
  const dbMember = await members.findPortalMember(ctx, memberId, tenantGymId);

  if (!dbMember) {
    redirect("/member/logout");
  }

  return {
    memberId: dbMember.id,
    gymId: dbMember.gymId,
    name: dbMember.name,
    memberNumber: dbMember.memberNumber,
  };
});

export async function getCurrentMember(): Promise<MemberSession | null> {
  return resolveCurrentMember();
}

export async function requireMember(): Promise<MemberSession> {
  const member = await getCurrentMember();
  if (!member) {
    const session = await memberAuth();
    redirect(await resolveMemberLoginRedirect(session?.user?.gymId));
  }
  return member;
}

/** Resolve gym registration token for login redirects (tenant-safe via member gymId). */
export async function getMemberGymLoginToken(gymId: string): Promise<string | null> {
  const { gyms } = getRepositories();
  return gyms.getRegistrationToken(platformContext, gymId);
}

/** Gym-specific member login URL, or generic index when token unknown. */
export async function resolveMemberLoginRedirect(
  gymId?: string | null,
): Promise<string> {
  if (gymId) {
    const token = await getMemberGymLoginToken(gymId);
    if (token) return `/member/login/${token}`;
  }
  return "/member/login";
}
