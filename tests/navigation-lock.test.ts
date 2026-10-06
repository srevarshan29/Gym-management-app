import { describe, expect, it } from "vitest";

import {
  buildRouteKey,
  hrefRouteKey,
} from "@/hooks/use-navigation-lock";

describe("navigation lock route keys", () => {
  it("hrefRouteKey preserves query strings", () => {
    expect(hrefRouteKey("/members/register-qr?view=converted")).toBe(
      "/members/register-qr?view=converted",
    );
    expect(hrefRouteKey("/members/register-qr")).toBe("/members/register-qr");
  });

  it("buildRouteKey matches hrefRouteKey for the same location", () => {
    const params = new URLSearchParams("view=converted");
    expect(buildRouteKey("/members/register-qr", params)).toBe(
      hrefRouteKey("/members/register-qr?view=converted"),
    );
    expect(buildRouteKey("/members/register-qr", new URLSearchParams())).toBe(
      "/members/register-qr",
    );
  });

  it("pending default href is not equal to query view route keys", () => {
    const pending = hrefRouteKey("/members/register-qr");
    const converted = buildRouteKey(
      "/members/register-qr",
      new URLSearchParams("view=converted"),
    );
    const all = buildRouteKey(
      "/members/register-qr",
      new URLSearchParams("view=all"),
    );
    expect(pending).not.toBe(converted);
    expect(pending).not.toBe(all);
  });
});
