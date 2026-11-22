"use client";

import React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";

import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";

import { authenticate, startStaffGoogleSignIn } from "@/app/actions/auth";
import { PasswordInputWithToggle } from "@/components/auth/password-input-with-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SuperAdminSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
      {pending ? "Signing in..." : "Sign in as platform super admin"}
    </Button>
  );
}

export function LoginForm({
  staffGoogleSignInEnabled,
  googleSignInError,
}: {
  staffGoogleSignInEnabled: boolean;
  googleSignInError?: boolean;
}) {
  const guardedAction = useGuardedFormAction(authenticate);
  const [errorMessage, formAction] = useFormState(guardedAction, undefined);
  const [googlePending, setGooglePending] = React.useState(false);

  async function handleGoogleSignIn() {
    setGooglePending(true);
    try {
      await startStaffGoogleSignIn();
    } catch {
      setGooglePending(false);
    }
  }

  return (
    <div className="space-y-6">
      {staffGoogleSignInEnabled ? (
        <div className="space-y-2">
          <Button
            type="button"
            className="w-full"
            disabled={googlePending}
            onClick={handleGoogleSignIn}
          >
            {googlePending ? "Redirecting..." : "Sign in with Google"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            For registered gym owners, admins, staff and platform super
            administrators. Use the Google account matching your account email.
          </p>
        </div>
      ) : null}

      {googleSignInError ? (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Google sign-in was not allowed. Use a verified Google account that
            matches an existing staff or super admin email, and ensure the gym
            is active when signing in as gym staff.
          </span>
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium">Platform super administrator</p>
        <p className="text-xs text-muted-foreground">
          Email and password sign-in remains available for platform super
          administrators until Google sign-in is fully verified.
        </p>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@gymdesk.test"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Super admin password reset
              </Link>
            </div>
            <PasswordInputWithToggle
              id="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {errorMessage ? (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <SuperAdminSubmitButton />
        </form>
      </div>
    </div>
  );
}