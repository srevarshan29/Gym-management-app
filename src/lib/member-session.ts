import { cache } from "react";

import { redirect } from "next/navigation";



import { memberAuth } from "@/member-auth";

import { withPlatformLookup } from "@/lib/db-context";



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



  const gymId = session.user.gymId;

  const memberId = session.user.memberId;



  const dbMember = await withPlatformLookup((tx) =>

    tx.member.findFirst({

      where: {

        id: memberId,

        gymId,

      },

      select: {

        id: true,

        gymId: true,

        name: true,

        memberNumber: true,

        portalEnabledAt: true,

      },

    }),

  );



  if (!dbMember?.portalEnabledAt) {

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

  const gym = await withPlatformLookup((tx) =>

    tx.gym.findUnique({

      where: { id: gymId },

      select: { registrationToken: true },

    }),

  );

  return gym?.registrationToken ?? null;
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

