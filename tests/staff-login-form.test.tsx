import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/app/actions/auth", () => ({
  authenticate: vi.fn(),
  startStaffGoogleSignIn: vi.fn(),
}));

import { LoginForm } from "@/app/(auth)/login/login-form";

describe("staff login — Google only", () => {
  it("renders Google sign-in without email/password fields", () => {
    const html = renderToStaticMarkup(
      <LoginForm staffGoogleSignInEnabled={true} />,
    );
    expect(html).toContain("Sign in with Google");
    expect(html).toContain('type="button"');
    expect(html).not.toContain('type="password"');
    expect(html).not.toContain("/forgot-password");
    expect(html).not.toContain("platform super administrator");
  });

  it("shows configuration error when Google is not enabled", () => {
    const html = renderToStaticMarkup(
      <LoginForm staffGoogleSignInEnabled={false} />,
    );
    expect(html).toContain("Google sign-in is not configured");
  });
});