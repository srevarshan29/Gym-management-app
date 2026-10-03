import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const waitUntil = vi.fn((promise: Promise<unknown>) => promise);

vi.mock("@vercel/functions", () => ({
  waitUntil,
}));

describe("scheduleBackgroundWork", () => {
  beforeEach(() => {
    waitUntil.mockClear();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("registers work with waitUntil on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    const { scheduleBackgroundWork } = await import("@/lib/schedule-background-work");

    let ran = false;
    scheduleBackgroundWork(async () => {
      ran = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(ran).toBe(true);
  });

  it("swallows background task errors", async () => {
    vi.stubEnv("VERCEL", "0");
    const { scheduleBackgroundWork } = await import("@/lib/schedule-background-work");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    scheduleBackgroundWork(async () => {
      throw new Error("notify failed");
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(errorSpy).toHaveBeenCalledWith(
      "[background-work] Task failed:",
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});
