import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resendSendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: resendSendMock };
  },
}));

describe("sendMemberPortalInvitationEmail (mocked Resend)", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    resendSendMock.mockReset();
    process.env = {
      ...envBackup,
      RESEND_API_KEY: "re_test_key",
      RESEND_FROM_EMAIL: "Iron Gym <noreply@iron-gym.example>",
      VERCEL_ENV: "development",
    };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  async function loadSender() {
    return import("@/lib/email/send-member-portal-invitation-email");
  }

  it("sends to the member recipient with gym portal URL in HTML and idempotency key", async () => {
    resendSendMock.mockResolvedValue({
      data: { id: "re_msg_abc123" },
      error: null,
    });

    const portalUrl =
      "https://production.gymdesk.test/member/login/gym-reg-token-xyz";
    const { sendMemberPortalInvitationEmail } = await loadSender();
    const result = await sendMemberPortalInvitationEmail({
      to: "member@example.com",
      subject: "Welcome to Iron Gym — Your Member Portal",
      html: `<a href="${portalUrl}">Open My Member Portal</a>`,
      text: `Sign in at ${portalUrl}`,
      idempotencyKey: "portal-invite:g1__m1__PORTAL_INVITE__AUTO:attempt:1",
    });

    expect(result).toEqual({
      outcome: "sent",
      providerMessageId: "re_msg_abc123",
    });
    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Iron Gym <noreply@iron-gym.example>",
        to: "member@example.com",
        subject: "Welcome to Iron Gym — Your Member Portal",
        html: expect.stringContaining(portalUrl),
        text: expect.stringContaining(portalUrl),
      }),
      {
        idempotencyKey:
          "portal-invite:g1__m1__PORTAL_INVITE__AUTO:attempt:1",
      },
    );
  });

  it("returns skipped when RESEND_FROM_EMAIL is missing (cannot become sent)", async () => {
    delete process.env.RESEND_FROM_EMAIL;
    const { sendMemberPortalInvitationEmail } = await loadSender();
    const result = await sendMemberPortalInvitationEmail({
      to: "member@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
      text: "Hi",
      idempotencyKey: "key-1",
    });
    expect(result).toEqual({ outcome: "skipped", reason: "not_configured" });
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("returns skipped for unverified onboarding sender in production", async () => {
    process.env.RESEND_FROM_EMAIL = "Test <onboarding@resend.dev>";
    process.env.VERCEL_ENV = "production";
    const { sendMemberPortalInvitationEmail } = await loadSender();
    const result = await sendMemberPortalInvitationEmail({
      to: "member@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
      text: "Hi",
      idempotencyKey: "key-1",
    });
    expect(result).toEqual({ outcome: "skipped", reason: "not_configured" });
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("returns failed when Resend returns no message id (cannot become sent)", async () => {
    resendSendMock.mockResolvedValue({ data: {}, error: null });
    const { sendMemberPortalInvitationEmail } = await loadSender();
    const result = await sendMemberPortalInvitationEmail({
      to: "member@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
      text: "Hi",
      idempotencyKey: "key-1",
    });
    expect(result.outcome).toBe("failed");
    if (result.outcome === "failed") {
      expect(result.message).toMatch(/message id/i);
    }
  });

  it("returns failed when Resend reports an error", async () => {
    resendSendMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid from address" },
    });
    const { sendMemberPortalInvitationEmail } = await loadSender();
    const result = await sendMemberPortalInvitationEmail({
      to: "member@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
      text: "Hi",
      idempotencyKey: "key-1",
    });
    expect(result).toEqual({
      outcome: "failed",
      message: "Invalid from address",
    });
  });
});

describe("processMemberPortalInvitation status mapping (mocked send)", () => {
  const {
    findByIdAndGym,
    claimMemberPortalInvitationSend,
    completeMemberPortalInvitationAttempt,
    getMemberPortalAutoInvitation,
    ensureMemberPortalInvitationRecord,
  } = vi.hoisted(() => ({
    findByIdAndGym: vi.fn(),
    claimMemberPortalInvitationSend: vi.fn(),
    completeMemberPortalInvitationAttempt: vi.fn(),
    getMemberPortalAutoInvitation: vi.fn(),
    ensureMemberPortalInvitationRecord: vi.fn(),
  }));

  vi.mock("@/lib/firestore", () => ({
    getRepositories: () => ({
      members: { findByIdAndGym },
      notificationDeliveries: {
        getMemberPortalAutoInvitation,
        ensureMemberPortalInvitationRecord,
        claimMemberPortalInvitationSend,
        completeMemberPortalInvitationAttempt,
      },
      gyms: { getRegistrationToken: vi.fn() },
    }),
    platformContext: { kind: "platform" },
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    findByIdAndGym.mockResolvedValue({
      id: "m1",
      gymId: "gym-a",
      name: "Alex",
      email: "alex@example.com",
    });
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

  it("never completes SENT when provider returns skipped", async () => {
    const { processMemberPortalInvitation } = await import(
      "@/lib/member-portal-invitation/process"
    );
    const result = await processMemberPortalInvitation(
      { gymId: "gym-a", memberId: "m1" },
      {
        isEmailConfigured: () => true,
        getRegistrationToken: async () => "token",
        getGymName: async () => "Gym",
        sendEmail: async () => ({ outcome: "skipped", reason: "not_configured" }),
      },
    );
    expect(result).toBe("not_configured");
    expect(completeMemberPortalInvitationAttempt).toHaveBeenCalledWith(
      expect.any(String),
      "NOT_CONFIGURED",
    );
    expect(completeMemberPortalInvitationAttempt).not.toHaveBeenCalledWith(
      expect.any(String),
      "SENT",
      expect.anything(),
    );
  });
});
