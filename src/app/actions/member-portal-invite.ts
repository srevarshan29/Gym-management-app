"use server";

import { revalidatePath } from "next/cache";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { getAppBaseUrlFromRequest } from "@/lib/registration";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  DUPLICATE_MEMBER_EMAIL_MESSAGE,
  findGymMembersByEmail,
} from "@/lib/member-portal/email";

export async function enableMemberPortalAccess(
  memberId: string,
): Promise<ActionResult<{ loginUrl: string }>> {
  const user = await requireGym();
  const tenantGymId = user.gymId;

  const member = await withTenant(tenantGymId, (tx) =>
    tx.member.findFirst({
      where: { id: memberId, gymId: tenantGymId },
      select: {
        id: true,
        email: true,
        portalEnabledAt: true,
        gym: { select: { registrationToken: true } },
      },
    }),
  );
  if (!member) {
    return actionError("Member not found.");
  }

  const email = member.email?.trim();
  if (!email) {
    return actionError(
      "Add an email address on this member profile before enabling the portal.",
    );
  }

  const duplicates = await withTenant(tenantGymId, (tx) =>
    findGymMembersByEmail(tx, tenantGymId, email, {
      excludeMemberId: member.id,
    }),
  );
  if (duplicates.length > 0) {
    return actionError(DUPLICATE_MEMBER_EMAIL_MESSAGE);
  }

  if (!member.portalEnabledAt) {
    await withTenant(tenantGymId, (tx) =>
      tx.member.updateMany({
        where: { id: member.id, gymId: tenantGymId },
        data: { portalEnabledAt: new Date() },
      }),
    );
  }

  revalidatePath(`/members/${memberId}`);

  const base = await getAppBaseUrlFromRequest();
  const loginUrl = `${base}/member/login/${member.gym.registrationToken}`;

  return actionOk(
    member.portalEnabledAt
      ? "Portal is active. Copy the login link below."
      : "Member portal enabled. Copy the login link below.",
    { loginUrl },
  );
}
