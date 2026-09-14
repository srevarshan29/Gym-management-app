"use server";

import { revalidatePath } from "next/cache";

import { getRepositories, platformContext } from "@/lib/firestore";
import { staffContextFromUser } from "@/lib/firestore/session-context";
import { requireGym } from "@/lib/session";
import { getAppBaseUrlFromRequest } from "@/lib/registration";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  DUPLICATE_MEMBER_EMAIL_MESSAGE,
  findGymMembersByEmailFirestore,
} from "@/lib/member-portal/email";

export async function enableMemberPortalAccess(
  memberId: string,
): Promise<ActionResult<{ loginUrl: string }>> {
  const user = await requireGym();
  const tenantGymId = user.gymId;
  const ctx = staffContextFromUser(user);
  const { members, gyms } = getRepositories();

  const member = await members.findByIdAndGym(ctx, memberId, tenantGymId);
  if (!member) {
    return actionError("Member not found.");
  }

  const email = member.email?.trim();
  if (!email) {
    return actionError(
      "Add an email address on this member profile before enabling the portal.",
    );
  }

  const duplicates = await findGymMembersByEmailFirestore(
    tenantGymId,
    email,
    { excludeMemberId: member.id },
  );
  if (duplicates.length > 0) {
    return actionError(DUPLICATE_MEMBER_EMAIL_MESSAGE);
  }

  const wasEnabled = !!member.portalEnabledAt;
  if (!wasEnabled) {
    await members.enablePortal(ctx, tenantGymId, member.id);
  }

  revalidatePath(`/members/${memberId}`);

  const registrationToken = await gyms.getRegistrationToken(
    platformContext,
    tenantGymId,
  );
  if (!registrationToken) {
    return actionError("Gym registration link is not configured.");
  }

  const base = await getAppBaseUrlFromRequest();
  const loginUrl = `${base}/member/login/${registrationToken}`;

  return actionOk(
    wasEnabled
      ? "Portal is active. Copy the login link below."
      : "Member portal enabled. Copy the login link below.",
    { loginUrl },
  );
}
