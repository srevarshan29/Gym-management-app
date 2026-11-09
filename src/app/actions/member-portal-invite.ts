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
import { buildMemberPortalLoginUrl } from "@/lib/member-portal/portal-entry-url";
import { processMemberPortalInvitation } from "@/lib/member-portal-invitation/process";
import { consumeMemberPortalInviteResendAllowance } from "@/lib/member-portal-invitation/resend-rate-limit";

async function resolveMemberPortalLoginUrl(
  tenantGymId: string,
): Promise<ActionResult<{ loginUrl: string }>> {
  const { gyms } = getRepositories();
  const registrationToken = await gyms.getRegistrationToken(
    platformContext,
    tenantGymId,
  );
  if (!registrationToken) {
    return actionError("Gym registration link is not configured.");
  }
  const base = await getAppBaseUrlFromRequest();
  const loginUrl = buildMemberPortalLoginUrl(base, registrationToken);
  return actionOk(undefined, { loginUrl });
}

export async function enableMemberPortalAccess(
  memberId: string,
): Promise<ActionResult<{ loginUrl: string }>> {
  const user = await requireGym();
  const tenantGymId = user.gymId;
  const ctx = staffContextFromUser(user);
  const { members } = getRepositories();

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

  const loginUrlResult = await resolveMemberPortalLoginUrl(tenantGymId);
  if (!loginUrlResult.ok) return loginUrlResult;

  return actionOk(
    wasEnabled
      ? "Portal is active. Copy the login link below."
      : "Member portal enabled. Copy the login link below.",
    loginUrlResult.data,
  );
}

export async function getMemberPortalLoginLink(
  memberId: string,
): Promise<ActionResult<{ loginUrl: string }>> {
  const user = await requireGym();
  const ctx = staffContextFromUser(user);
  const { members } = getRepositories();

  const member = await members.findByIdAndGym(ctx, memberId, user.gymId);
  if (!member) {
    return actionError("Member not found.");
  }
  if (!member.portalEnabledAt) {
    return actionError("Enable the member portal before copying the login link.");
  }

  return resolveMemberPortalLoginUrl(user.gymId);
}

export async function resendMemberPortalInvitation(
  memberId: string,
): Promise<ActionResult> {
  const user = await requireGym();
  const tenantGymId = user.gymId;
  const ctx = staffContextFromUser(user);

  const { members, notificationDeliveries } = getRepositories();
  const member = await members.findByIdAndGym(ctx, memberId, tenantGymId);
  if (!member) {
    return actionError("Member not found.");
  }

  const email = member.email?.trim();
  if (!email) {
    return actionError(
      "Add an email address on this member profile before sending an invitation.",
    );
  }

  if (!member.portalEnabledAt) {
    return actionError("Enable the member portal before sending an invitation.");
  }

  const rate = await consumeMemberPortalInviteResendAllowance(
    tenantGymId,
    member.id,
  );
  if (!rate.ok) {
    const minutes = Math.max(1, Math.ceil(rate.retryAfterMs / 60_000));
    return actionError(
      `Too many invitation attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    );
  }

  await notificationDeliveries.ensureMemberPortalInvitationRecord({
    gymId: tenantGymId,
    memberId: member.id,
    recipientEmail: email,
    trigger: "STAFF_RESEND",
  });

  const result = await processMemberPortalInvitation({
    gymId: tenantGymId,
    memberId: member.id,
    staffCtx: ctx,
  });

  revalidatePath(`/members/${memberId}`);

  if (result === "sent") {
    return actionOk("Invitation email sent.");
  }
  if (result === "not_configured") {
    return actionError(
      "Invitation email is not configured (check member email, gym login link, and Resend settings).",
    );
  }
  if (result === "send_failed") {
    return actionError("Failed to send invitation email. Try again later.");
  }
  if (result === "skipped_already_sent") {
    return actionOk("Invitation was already sent.");
  }

  return actionError("Could not send invitation email.");
}
