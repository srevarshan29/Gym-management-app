import { getRepositories, platformContext } from "@/lib/firestore";
import type { FirestoreContext } from "@/lib/firestore/context";
import { sendMemberPortalInvitationEmail } from "@/lib/email/send-member-portal-invitation-email";
import type { MemberPortalInvitationEmailSendResult } from "@/lib/email/send-member-portal-invitation-email";
import { isMemberPortalInvitationEmailConfigured } from "@/lib/member-portal-invitation/email-config";
import { getGymProfilePlatform } from "@/lib/gym-profile";
import { normalizeMemberEmail } from "@/lib/member-portal/constants";
import { buildMemberPortalLoginUrl } from "@/lib/member-portal/portal-entry-url";
import { getAppBaseUrl } from "@/lib/registration";
import { buildMemberPortalAutoInviteDeliveryId } from "@/lib/member-portal-invitation/delivery-id";
import { buildMemberPortalWelcomeEmail } from "@/lib/member-portal-invitation/template";
import {
  MAX_MEMBER_PORTAL_INVITE_ATTEMPTS,
  type MemberPortalInvitationProcessResult,
} from "@/lib/member-portal-invitation/types";

export type MemberPortalInvitationProcessorDeps = {
  sendEmail?: (params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    idempotencyKey: string;
  }) => Promise<MemberPortalInvitationEmailSendResult>;
  isEmailConfigured?: () => boolean;
  getRegistrationToken?: (gymId: string) => Promise<string | null>;
  getGymName?: (gymId: string) => Promise<string>;
};

const defaultDeps: Required<MemberPortalInvitationProcessorDeps> = {
  sendEmail: sendMemberPortalInvitationEmail,
  isEmailConfigured: isMemberPortalInvitationEmailConfigured,
  getRegistrationToken: async (gymId) => {
    const { gyms } = getRepositories();
    return gyms.getRegistrationToken(platformContext, gymId);
  },
  getGymName: async (gymId) => {
    const profile = await getGymProfilePlatform(gymId);
    return profile.name;
  },
};

export async function processMemberPortalInvitation(
  params: {
    gymId: string;
    memberId: string;
    staffCtx?: FirestoreContext;
  },
  deps: MemberPortalInvitationProcessorDeps = {},
): Promise<MemberPortalInvitationProcessResult> {
  const merged = { ...defaultDeps, ...deps };
  const { notificationDeliveries, members } = getRepositories();
  const deliveryId = buildMemberPortalAutoInviteDeliveryId(params);

  const memberCtx = params.staffCtx ?? platformContext;
  const member = await members.findByIdAndGym(
    memberCtx,
    params.memberId,
    params.gymId,
  );
  if (!member) {
    return "skipped_member_missing";
  }

  const normalizedEmail = member.email
    ? normalizeMemberEmail(member.email)
    : "";
  if (!normalizedEmail) {
    await notificationDeliveries
      .completeMemberPortalInvitationAttempt(deliveryId, "NOT_CONFIGURED")
      .catch(() => undefined);
    return "not_configured";
  }

  const existingDelivery =
    await notificationDeliveries.getMemberPortalAutoInvitation(
      params.gymId,
      params.memberId,
    );
  if (!existingDelivery) {
    await notificationDeliveries.ensureMemberPortalInvitationRecord({
      gymId: params.gymId,
      memberId: params.memberId,
      recipientEmail: normalizedEmail,
      trigger: "AUTO_ON_REGISTER",
    });
  }

  const claim = await notificationDeliveries.claimMemberPortalInvitationSend(
    deliveryId,
  );
  if (!claim.ok) {
    switch (claim.reason) {
      case "already_sent":
        return "skipped_already_sent";
      case "max_attempts":
      case "failed_final":
        return "skipped_max_attempts";
      case "in_flight":
        return "skipped_in_flight";
      case "not_configured":
        return "not_configured";
      default:
        return "send_failed";
    }
  }

  const registrationToken = await merged.getRegistrationToken(params.gymId);
  if (!registrationToken || !merged.isEmailConfigured()) {
    await notificationDeliveries.completeMemberPortalInvitationAttempt(
      deliveryId,
      "NOT_CONFIGURED",
    );
    return "not_configured";
  }

  const portalLoginUrl = buildMemberPortalLoginUrl(
    getAppBaseUrl(),
    registrationToken,
  );
  const gymName = await merged.getGymName(params.gymId);
  const { subject, html, text } = buildMemberPortalWelcomeEmail({
    memberName: member.name,
    memberEmail: normalizedEmail,
    gymName,
    portalLoginUrl,
  });

  const sendResult = await merged.sendEmail({
    to: normalizedEmail,
    subject,
    html,
    text,
    idempotencyKey: claim.idempotencyKey,
  });

  if (sendResult.outcome === "sent") {
    await notificationDeliveries.completeMemberPortalInvitationAttempt(
      deliveryId,
      "SENT",
      { providerMessageId: sendResult.providerMessageId },
    );
    return "sent";
  }

  if (sendResult.outcome === "skipped") {
    await notificationDeliveries.completeMemberPortalInvitationAttempt(
      deliveryId,
      "NOT_CONFIGURED",
    );
    return "not_configured";
  }

  const finalFailure =
    claim.attemptNumber >= MAX_MEMBER_PORTAL_INVITE_ATTEMPTS;
  await notificationDeliveries.completeMemberPortalInvitationAttempt(
    deliveryId,
    finalFailure ? "FAILED" : "PENDING",
  );

  return "send_failed";
}
