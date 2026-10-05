import { beforeEach, describe, expect, it, vi } from "vitest";

import { memberAuthConfig } from "@/member-auth.config";
import {
  assertMemberPortalQrUrlIsSafe,
  buildMemberPortalLoginUrl,
  getMemberPortalLoginPath,
} from "@/lib/member-portal/portal-entry-url";
import { getGymByRegistrationToken } from "@/lib/member-portal/access";
import { getMemberPortalQrPageData } from "@/lib/member-portal/portal-qr-page";

const { getRegistrationToken, findByRegistrationToken } = vi.hoisted(() => ({
  getRegistrationToken: vi.fn(),
  findByRegistrationToken: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    gyms: {
      getRegistrationToken,
      findByRegistrationToken,
    },
  }),
  platformContext: { kind: "platform" },
}));

vi.mock("@/lib/registration", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/registration")>();
  return {
    ...actual,
    getAppBaseUrlFromRequest: vi.fn(async () => "https://app.gymdesk.test"),
  };
});

function authorized(path: string, isLoggedIn: boolean) {
  return memberAuthConfig.callbacks.authorized({
    auth: isLoggedIn
      ? {
          user: {
            id: "member-1",
            kind: "member",
            memberId: "member-1",
            gymId: "gym-a",
          },
          expires: "2099-01-01T00:00:00.000Z",
        }
      : null,
    request: {
      nextUrl: new URL(`https://app.gymdesk.test${path}`),
    },
  } as Parameters<typeof memberAuthConfig.callbacks.authorized>[0]);
}

describe("member portal QR entry URL", () => {
  it("builds the gym-scoped member login path", () => {
    expect(getMemberPortalLoginPath("abc-reg-token")).toBe(
      "/member/login/abc-reg-token",
    );
    expect(buildMemberPortalLoginUrl("https://app.gymdesk.test", "abc-reg-token")).toBe(
      "https://app.gymdesk.test/member/login/abc-reg-token",
    );
  });

  it("does not embed member-sensitive data in the QR URL", () => {
    const url = buildMemberPortalLoginUrl(
      "https://app.gymdesk.test",
      "gym-public-token-xyz",
    );
    expect(() => assertMemberPortalQrUrlIsSafe(url)).not.toThrow();
    expect(url).not.toMatch(/memberId|memberNumber|email|phone|password|@/i);
    expect(url).not.toContain("?");
  });

  it("rejects URLs that look like they carry member PII", () => {
    expect(() =>
      assertMemberPortalQrUrlIsSafe(
        "https://app.gymdesk.test/member/login/token?memberId=abc",
      ),
    ).toThrow();
    expect(() =>
      assertMemberPortalQrUrlIsSafe(
        "https://app.gymdesk.test/member/login/email@test.com",
      ),
    ).toThrow();
  });
});

describe("member portal QR gym isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads portal URL from the requesting gym registration token only", async () => {
    getRegistrationToken.mockImplementation(async (_ctx, gymId: string) => {
      if (gymId === "gym-a") return "token-gym-a";
      if (gymId === "gym-b") return "token-gym-b";
      return null;
    });

    const dataA = await getMemberPortalQrPageData("gym-a");
    const dataB = await getMemberPortalQrPageData("gym-b");

    expect(dataA.portalLoginUrl).toBe(
      "https://app.gymdesk.test/member/login/token-gym-a",
    );
    expect(dataB.portalLoginUrl).toBe(
      "https://app.gymdesk.test/member/login/token-gym-b",
    );
    expect(dataA.portalLoginUrl).not.toBe(dataB.portalLoginUrl);
  });

  it("resolves gym login page only for matching registration token", async () => {
    findByRegistrationToken.mockImplementation(async (_ctx, token: string) => {
      if (token === "token-gym-a") {
        return {
          id: "gym-a",
          name: "Gym A",
          registrationToken: "token-gym-a",
        };
      }
      return null;
    });

    const gymA = await getGymByRegistrationToken("token-gym-a");
    const wrong = await getGymByRegistrationToken("token-gym-b");

    expect(gymA?.id).toBe("gym-a");
    expect(wrong).toBeNull();
  });
});

describe("member portal auth entry flow (existing middleware config)", () => {
  it("allows unauthenticated visitors on gym login entry paths", () => {
    expect(authorized("/member/login/token-gym-a", false)).toBe(true);
    expect(authorized("/member/login", false)).toBe(true);
  });

  it("requires auth for portal routes", () => {
    expect(authorized("/member", false)).toBe(false);
    expect(authorized("/member/profile", false)).toBe(false);
  });

  it("sends authenticated members from login to their portal home", () => {
    const result = authorized("/member/login/token-gym-a", true);
    expect(result).toBeInstanceOf(Response);
    const location = (result as Response).headers.get("location");
    expect(location).toBe("https://app.gymdesk.test/member");
  });
});
