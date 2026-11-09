import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { resendMemberPortalInvitation } from "@/app/actions/member-portal-invite";
import { buildMemberPortalAutoInviteDeliveryId } from "@/lib/member-portal-invitation/delivery-id";
import { afterMemberRegistered } from "@/lib/member-portal-invitation/on-member-created";
import { buildMemberPortalWelcomeEmail } from "@/lib/member-portal-invitation/template";

const processMemberPortalInvitationMock = vi.fn();

const {
  enablePortal,
  findByIdAndGym,
  queueAutoMemberPortalInvitation,
  getMemberPortalAutoInvitation,
  ensureMemberPortalInvitationRecord,
  claimMemberPortalInvitationSend,
  completeMemberPortalInvitationAttempt,
  shouldRecoverMemberPortalInvitation,
  requireGym,
  scheduleMemberPortalInvitationProcessing,
  checkAndConsumeResend,
} = vi.hoisted(() => ({
  enablePortal: vi.fn(),
  findByIdAndGym: vi.fn(),
  queueAutoMemberPortalInvitation: vi.fn(),
  getMemberPortalAutoInvitation: vi.fn(),
  ensureMemberPortalInvitationRecord: vi.fn(),
  claimMemberPortalInvitationSend: vi.fn(),
  completeMemberPortalInvitationAttempt: vi.fn(),
  shouldRecoverMemberPortalInvitation: vi.fn(),
  requireGym: vi.fn(),
  scheduleMemberPortalInvitationProcessing: vi.fn(),
  checkAndConsumeResend: vi.fn(),
}));

vi.mock("@/lib/member-portal-invitation/process", () => ({
  processMemberPortalInvitation: (...args: unknown[]) =>
    processMemberPortalInvitationMock(...args),
}));

vi.mock("@/lib/member-portal-invitation/resend-rate-limit", () => ({
  consumeMemberPortalInviteResendAllowance: (...args: unknown[]) =>
    checkAndConsumeResend(...args),
}));
vi.mock("@/lib/session", () => ({ requireGym }));
vi.mock("@/lib/firestore/session-context", () => ({
  staffContextFromUser: (user: { gymId: string; id: string }) => ({
    kind: "staff",
    gymId: user.gymId,
    staffId: user.id,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/schedule-background-work", () => ({
  scheduleMemberPortalInvitationProcessing,
}));
vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    members: { enablePortal, findByIdAndGym },
    notificationDeliveries: {
      queueAutoMemberPortalInvitation,
      getMemberPortalAutoInvitation,
      ensureMemberPortalInvitationRecord,
      claimMemberPortalInvitationSend,
      completeMemberPortalInvitationAttempt,
      shouldRecoverMemberPortalInvitation,
    },
  }),
  platformContext: { kind: "platform" },
}));

describe("buildMemberPortalWelcomeEmail", () => {
  it("includes member name, gym name, email, and portal URL", () => {
    const { subject, html, text } = buildMemberPortalWelcomeEmail({
      memberName: "Priya Sharma",
      memberEmail: "priya@example.com",
      gymName: "Iron Temple",
      portalLoginUrl: "https://app.gymdesk.test/member/login/gym-token",
    });

    expect(subject).toBe("Welcome to Iron Temple — Your Member Portal");
    expect(text).toContain("Priya Sharma");
    expect(text).toContain("priya@example.com");
    expect(text).toContain("https://app.gymdesk.test/member/login/gym-token");
    expect(html).toContain("Open My Member Portal");
    expect(html).toContain("priya@example.com");
    expect(html).not.toContain("<script");
  });

  it("escapes dynamic HTML values", () => {
    const { html } = buildMemberPortalWelcomeEmail({
      memberName: `<img onerror="x"`,
      memberEmail: `a@b.com"><script>`,
      gymName: `Gym & Co`,
      portalLoginUrl: "https://example.com/member/login/t",
    });
    expect(html).toContain("&lt;img onerror=&quot;x&quot;");
    expect(html).not.toContain("<script>");
  });
});

describe("buildMemberPortalAutoInviteDeliveryId", () => {
  it("is stable per gym and member", () => {
    expect(
      buildMemberPortalAutoInviteDeliveryId({ gymId: "g1", memberId: "m1" }),
    ).toBe("g1__m1__PORTAL_INVITE__AUTO");
  });
});

describe("afterMemberRegistered", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByIdAndGym.mockResolvedValue({
      id: "m1",
      email: "member@test.com",
    });
    queueAutoMemberPortalInvitation.mockResolvedValue(true);
  });

  it("enables portal and queues one invitation", async () => {
    await afterMemberRegistered({
      gymId: "gym-a",
      memberId: "m1",
      staffCtx: { kind: "staff", gymId: "gym-a", userId: "s1", role: "OWNER" },
    });

    expect(enablePortal).toHaveBeenCalledWith(
      expect.objectContaining({ gymId: "gym-a" }),
      "gym-a",
      "m1",
    );
    expect(queueAutoMemberPortalInvitation).toHaveBeenCalledWith({
      gymId: "gym-a",
      memberId: "m1",
      recipientEmail: "member@test.com",
    });
    expect(scheduleMemberPortalInvitationProcessing).toHaveBeenCalledWith(
      "gym-a",
      "m1",
    );
  });

  it("does not queue duplicate automatic invitations", async () => {
    queueAutoMemberPortalInvitation.mockResolvedValue(false);
    getMemberPortalAutoInvitation.mockResolvedValue({
      status: "SENT",
      recipientEmail: "member@test.com",
      lastAttemptAt: null,
    });

    await afterMemberRegistered({
      gymId: "gym-a",
      memberId: "m1",
      staffCtx: { kind: "staff", gymId: "gym-a", userId: "s1", role: "OWNER" },
    });

    expect(scheduleMemberPortalInvitationProcessing).not.toHaveBeenCalled();
  });
});

describe("processMemberPortalInvitation", () => {
  const member = {
    id: "m1",
    gymId: "gym-a",
    name: "Alex Member",
    email: "alex@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    findByIdAndGym.mockResolvedValue(member);
    getMemberPortalAutoInvitation.mockResolvedValue({
      status: "PENDING",
      recipientEmail: "alex@example.com",
      lastAttemptAt: null,
    });
    claimMemberPortalInvitationSend.mockResolvedValue({
      ok: true,
      attemptNumber: 1,
      idempotencyKey: "idem-1",
    });
    completeMemberPortalInvitationAttempt.mockResolvedValue(undefined);
  });

  it("marks NOT_CONFIGURED when Resend is not configured", async () => {
    const { processMemberPortalInvitation } = await vi.importActual<
      typeof import("@/lib/member-portal-invitation/process")
    >("@/lib/member-portal-invitation/process");
    const result = await processMemberPortalInvitation(
      { gymId: "gym-a", memberId: "m1" },
      {
        isEmailConfigured: () => false,
        getRegistrationToken: async () => "token-1",
        getGymName: async () => "Test Gym",
        sendEmail: async () => ({
          outcome: "sent",
          providerMessageId: "re_msg_1",
        }),
      },
    );

    expect(result).toBe("not_configured");
    expect(completeMemberPortalInvitationAttempt).toHaveBeenCalledWith(
      buildMemberPortalAutoInviteDeliveryId({ gymId: "gym-a", memberId: "m1" }),
      "NOT_CONFIGURED",
    );
  });

  it("uses canonical portal URL with gym registration token", async () => {
    const { processMemberPortalInvitation } = await vi.importActual<
      typeof import("@/lib/member-portal-invitation/process")
    >("@/lib/member-portal-invitation/process");
    const sendEmail = vi.fn(async () => ({
      outcome: "sent" as const,
      providerMessageId: "re_msg_1",
    }));
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://production.gymdesk.test";

    await processMemberPortalInvitation(
      { gymId: "gym-a", memberId: "m1" },
      {
        isEmailConfigured: () => true,
        getRegistrationToken: async () => "reg-token-abc",
        getGymName: async () => "Production Gym",
        sendEmail,
      },
    );

    process.env.NEXT_PUBLIC_APP_URL = prev;

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alex@example.com",
        subject: "Welcome to Production Gym — Your Member Portal",
        html: expect.stringContaining(
          "https://production.gymdesk.test/member/login/reg-token-abc",
        ),
      }),
    );
  });

  it("does not mark sent when send returns skipped", async () => {
    const { processMemberPortalInvitation } = await vi.importActual<
      typeof import("@/lib/member-portal-invitation/process")
    >("@/lib/member-portal-invitation/process");
    const result = await processMemberPortalInvitation(
      { gymId: "gym-a", memberId: "m1" },
      {
        isEmailConfigured: () => true,
        getRegistrationToken: async () => "token-1",
        getGymName: async () => "Gym",
        sendEmail: async () => ({ outcome: "skipped", reason: "not_configured" }),
      },
    );

    expect(result).toBe("not_configured");
    expect(completeMemberPortalInvitationAttempt).toHaveBeenCalledWith(
      expect.any(String),
      "NOT_CONFIGURED",
    );
  });

  it("skips duplicate sends when already sent", async () => {
    const { processMemberPortalInvitation } = await vi.importActual<
      typeof import("@/lib/member-portal-invitation/process")
    >("@/lib/member-portal-invitation/process");
    claimMemberPortalInvitationSend.mockResolvedValue({
      ok: false,
      reason: "already_sent",
    });
    getMemberPortalAutoInvitation.mockResolvedValue({
      status: "SENT",
      recipientEmail: "alex@example.com",
      lastAttemptAt: new Date(),
    });

    const sendEmail = vi.fn();
    const result = await processMemberPortalInvitation(
      { gymId: "gym-a", memberId: "m1" },
      {
        isEmailConfigured: () => true,
        getRegistrationToken: async () => "token-1",
        getGymName: async () => "Gym",
        sendEmail,
      },
    );

    expect(result).toBe("skipped_already_sent");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns in_flight when another worker holds the lease", async () => {
    const { processMemberPortalInvitation } = await vi.importActual<
      typeof import("@/lib/member-portal-invitation/process")
    >("@/lib/member-portal-invitation/process");
    claimMemberPortalInvitationSend.mockResolvedValue({
      ok: false,
      reason: "in_flight",
    });

    const result = await processMemberPortalInvitation(
      { gymId: "gym-a", memberId: "m1" },
      {
        isEmailConfigured: () => true,
        getRegistrationToken: async () => "token-1",
        getGymName: async () => "Gym",
        sendEmail: vi.fn(),
      },
    );

    expect(result).toBe("skipped_in_flight");
  });

  it("marks SENT only when provider returns a message id", async () => {
    const { processMemberPortalInvitation } = await vi.importActual<
      typeof import("@/lib/member-portal-invitation/process")
    >("@/lib/member-portal-invitation/process");

    const sendEmail = vi.fn(async () => ({
      outcome: "sent" as const,
      providerMessageId: "re_abc123",
    }));

    await processMemberPortalInvitation(
      { gymId: "gym-a", memberId: "m1" },
      {
        isEmailConfigured: () => true,
        getRegistrationToken: async () => "token-1",
        getGymName: async () => "Gym",
        sendEmail,
      },
    );

    expect(completeMemberPortalInvitationAttempt).toHaveBeenCalledWith(
      buildMemberPortalAutoInviteDeliveryId({ gymId: "gym-a", memberId: "m1" }),
      "SENT",
      { providerMessageId: "re_abc123" },
    );
  });
});

describe("resendMemberPortalInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processMemberPortalInvitationMock.mockResolvedValue("sent");
    checkAndConsumeResend.mockResolvedValue({ ok: true });
    requireGym.mockResolvedValue({
      id: "staff-1",
      gymId: "gym-a",
      role: "OWNER",
      name: "Owner",
      email: "o@test.com",
    });
    findByIdAndGym.mockImplementation(
      async (_ctx: unknown, memberId: string, gymId: string) => {
        if (gymId !== "gym-a") return null;
        if (memberId === "other-gym-member") return null;
        return {
          id: memberId,
          gymId: "gym-a",
          email: "member@test.com",
          portalEnabledAt: new Date(),
          name: "Member",
        };
      },
    );
    ensureMemberPortalInvitationRecord.mockResolvedValue("delivery-id");
    getMemberPortalAutoInvitation.mockResolvedValue({
      status: "PENDING",
      recipientEmail: "member@test.com",
      lastAttemptAt: null,
    });
  });

  it("rejects cross-gym resend attempts", async () => {
    const result = await resendMemberPortalInvitation("other-gym-member");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not found/i);
    }
    expect(checkAndConsumeResend).not.toHaveBeenCalled();
  });

  it("allows authorized staff resend", async () => {
    const result = await resendMemberPortalInvitation("m1");
    expect(result.ok).toBe(true);
    expect(ensureMemberPortalInvitationRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        gymId: "gym-a",
        memberId: "m1",
        trigger: "STAFF_RESEND",
      }),
    );
    expect(processMemberPortalInvitationMock).toHaveBeenCalled();
  });
});

describe("createMember integration hooks", () => {
  it("queues portal invitation without blocking registration on errors", () => {
    const source = readFileSync(
      resolve("src/app/actions/members.ts"),
      "utf8",
    );
    expect(source).toContain("afterMemberRegistered");
    expect(source).toContain("member portal invitation setup failed");
    expect(source).toContain("schedulePaymentLogged");
    expect(source).toMatch(
      /afterMemberRegistered\([\s\S]*?\)\.catch/,
    );
    const afterInvite = source.indexOf("afterMemberRegistered");
    const receiptRedirect = source.indexOf("redirect(`/members/${memberId}?receipt=");
    const plainRedirect = source.indexOf("redirect(`/members/${memberId}`);");
    expect(afterInvite).toBeGreaterThan(-1);
    expect(receiptRedirect).toBeGreaterThan(afterInvite);
    expect(plainRedirect).toBeGreaterThan(afterInvite);
  });
});

describe("sendTransactionalEmail configuration", () => {
  it("reports skipped when RESEND_API_KEY is missing", async () => {
    const prev = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    vi.resetModules();
    const mod = await import("@/lib/email/send-transactional-email");
    expect(mod.isTransactionalEmailConfigured()).toBe(false);
    const result = await mod.sendTransactionalEmail({
      to: "x@test.com",
      subject: "Test",
      html: "<p>Hi</p>",
    });
    expect(result).toEqual({ outcome: "skipped", reason: "not_configured" });
    process.env.RESEND_API_KEY = prev;
  });
});
