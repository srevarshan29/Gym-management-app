import { beforeEach, describe, expect, it, vi } from "vitest";

const { schedulePaymentLogged, logPaymentWithReceipt } = vi.hoisted(() => ({
  schedulePaymentLogged: vi.fn(),
  logPaymentWithReceipt: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  schedulePaymentLogged,
}));

vi.mock("@/lib/firestore", () => ({
  logPaymentWithReceipt,
  getRepositories: vi.fn(() => ({
    members: {
      findByIdAndGym: vi.fn().mockResolvedValue({ id: "m1", name: "Priya" }),
    },
    subscriptions: { findById: vi.fn() },
  })),
}));

vi.mock("@/lib/session", () => ({
  requireGym: vi.fn().mockResolvedValue({
    id: "staff-1",
    gymId: "gym-1",
    role: "STAFF",
    email: "staff@gym.com",
    name: "Staff",
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { logPayment } from "@/app/actions/payments";

describe("logPayment notifications", () => {
  beforeEach(() => {
    schedulePaymentLogged.mockReset();
    logPaymentWithReceipt.mockReset();
  });

  it("schedules notifications for new payments", async () => {
    logPaymentWithReceipt.mockResolvedValue({
      paymentId: "pay-1",
      isDuplicate: false,
    });

    const form = new FormData();
    form.set("memberId", "m1");
    form.set("amount", "1000");
    form.set("method", "CASH");

    const result = await logPayment(undefined, form);

    expect(result.ok).toBe(true);
    expect(schedulePaymentLogged).toHaveBeenCalledWith("gym-1", "pay-1");
  });

  it("does not schedule notifications for duplicate payments", async () => {
    logPaymentWithReceipt.mockResolvedValue({
      paymentId: "pay-dup",
      isDuplicate: true,
    });

    const form = new FormData();
    form.set("memberId", "m1");
    form.set("amount", "1000");
    form.set("method", "CASH");

    const result = await logPayment(undefined, form);

    expect(result.ok).toBe(true);
    expect(schedulePaymentLogged).not.toHaveBeenCalled();
  });

  it("returns success when notifications are scheduled (failures run in background)", async () => {
    logPaymentWithReceipt.mockResolvedValue({
      paymentId: "pay-2",
      isDuplicate: false,
    });

    const form = new FormData();
    form.set("memberId", "m1");
    form.set("amount", "500");
    form.set("method", "UPI");

    const result = await logPayment(undefined, form);

    expect(result.ok).toBe(true);
    expect(schedulePaymentLogged).toHaveBeenCalled();
  });
});
