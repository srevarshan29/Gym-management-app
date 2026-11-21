import { describe, expect, it } from "vitest";

import { authConfig } from "@/auth.config";

describe("staff middleware cron API access", () => {
  function authorized(path: string, isLoggedIn: boolean) {
    return authConfig.callbacks.authorized({
      auth: isLoggedIn
        ? {
            user: { id: "u1", role: "OWNER", gymId: "gym-1", email: "a@test.com" },
            expires: "2099-01-01T00:00:00.000Z",
          }
        : null,
      request: {
        nextUrl: new URL(`https://app.gymdesk.test${path}`),
      },
    } as Parameters<NonNullable<typeof authConfig.callbacks.authorized>>[0]);
  }

  it("allows cron paths without a staff session", () => {
    expect(
      authorized("/api/cron/membership-expiry-reminders", false),
    ).toBe(true);
    expect(authorized("/api/cron/future-job", false)).toBe(true);
  });

  it("still requires authentication for other matched API paths", () => {
    expect(authorized("/api/internal/sync", false)).toBe(false);
    expect(authorized("/api/webhooks/stripe", false)).toBe(false);
  });

  it("still requires authentication for staff app routes", () => {
    expect(authorized("/", false)).toBe(false);
    expect(authorized("/members", false)).toBe(false);
  });
});