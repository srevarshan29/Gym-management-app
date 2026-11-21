import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/app/actions/auth", () => ({
  authenticate: vi.fn(),
}));

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return {
    ...actual,
    useFormState: () => [undefined, vi.fn()],
    useFormStatus: () => ({ pending: false }),
  };
});

import { LoginForm } from "@/app/(auth)/login/login-form";

describe("staff login password visibility", () => {
  it("starts hidden and offers a show-password control", () => {
    const html = renderToStaticMarkup(<LoginForm />);
    expect(html).toContain('type="password"');
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain('href="/forgot-password"');
    expect(html).toContain('type="button"');
  });
});
