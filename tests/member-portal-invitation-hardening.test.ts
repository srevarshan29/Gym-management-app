import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildMemberPortalInvitationIdempotencyKey } from "@/lib/member-portal-invitation/idempotency-key";
import {
  isLiveProductionEnvironment,
  isMemberPortalInvitationEmailConfigured,
} from "@/lib/member-portal-invitation/email-config";
import { buildMemberPortalAutoInviteDeliveryId } from "@/lib/member-portal-invitation/delivery-id";
import { consumeMemberPortalInviteResendAllowance } from "@/lib/member-portal-invitation/resend-rate-limit";

const { checkAndConsume } = vi.hoisted(() => ({
  checkAndConsume: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    memberPortalInviteResendThrottles: { checkAndConsume },
  }),
}));

describe("member portal invitation idempotency", () => {
  it("builds stable keys per delivery attempt", () => {
    const deliveryId = buildMemberPortalAutoInviteDeliveryId({
      gymId: "g1",
      memberId: "m1",
    });
    expect(buildMemberPortalInvitationIdempotencyKey(deliveryId, 1)).toBe(
      `portal-invite:${deliveryId}:attempt:1`,
    );
    expect(buildMemberPortalInvitationIdempotencyKey(deliveryId, 2)).not.toBe(
      buildMemberPortalInvitationIdempotencyKey(deliveryId, 1),
    );
  });
});

describe("member portal invitation email configuration", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  it("rejects onboarding sender in live production", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "Gym <onboarding@resend.dev>";
    process.env.VERCEL_ENV = "production";
    expect(isLiveProductionEnvironment()).toBe(true);
    expect(isMemberPortalInvitationEmailConfigured()).toBe(false);
  });

  it("requires RESEND_FROM_EMAIL for invitations", () => {
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.RESEND_FROM_EMAIL;
    process.env.VERCEL_ENV = "production";
    expect(isMemberPortalInvitationEmailConfigured()).toBe(false);
  });

  it("allows a custom sender in production", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "GymDesk <noreply@gym.example>";
    process.env.VERCEL_ENV = "production";
    expect(isMemberPortalInvitationEmailConfigured()).toBe(true);
  });
});

describe("persistent resend rate limiting", () => {
  beforeEach(() => {
    checkAndConsume.mockReset();
  });

  it("delegates to Firestore throttle repository", async () => {
    checkAndConsume.mockResolvedValue({ ok: true });
    const result = await consumeMemberPortalInviteResendAllowance("gym-a", "m1");
    expect(result.ok).toBe(true);
    expect(checkAndConsume).toHaveBeenCalledWith(
      "gym-a",
      "m1",
      5,
      15 * 60 * 1000,
    );
  });
});
