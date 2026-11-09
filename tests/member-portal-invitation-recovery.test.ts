import { beforeEach, describe, expect, it, vi } from "vitest";

const { listRecoverable, processInvitation } = vi.hoisted(() => ({
  listRecoverable: vi.fn(),
  processInvitation: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    notificationDeliveries: {
      listRecoverableMemberPortalInvitations: listRecoverable,
    },
  }),
}));

vi.mock("@/lib/member-portal-invitation/process", () => ({
  processMemberPortalInvitation: (...args: unknown[]) =>
    processInvitation(...args),
}));

import { runMemberPortalInvitationRecoveryJob } from "@/lib/member-portal-invitation/recovery-job";

describe("runMemberPortalInvitationRecoveryJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecoverable.mockResolvedValue([
      { gymId: "gym-a", memberId: "m1" },
      { gymId: "gym-b", memberId: "m2" },
    ]);
    processInvitation.mockResolvedValueOnce("sent");
    processInvitation.mockResolvedValueOnce("skipped_in_flight");
  });

  it("processes recoverable pending invitations without cross-gym coupling", async () => {
    const stats = await runMemberPortalInvitationRecoveryJob(new Date(), 50);

    expect(listRecoverable).toHaveBeenCalledWith(expect.any(Date), 50);
    expect(processInvitation).toHaveBeenCalledTimes(2);
    expect(processInvitation).toHaveBeenCalledWith({
      gymId: "gym-a",
      memberId: "m1",
    });
    expect(processInvitation).toHaveBeenCalledWith({
      gymId: "gym-b",
      memberId: "m2",
    });
    expect(stats).toEqual({
      candidates: 2,
      processed: 2,
      sent: 1,
      skipped: 1,
      failed: 0,
    });
  });
});
