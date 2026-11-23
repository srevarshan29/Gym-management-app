"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

import { startStaffGoogleSignIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LoginForm({
  staffGoogleSignInEnabled,
  googleSignInError,
}: {
  staffGoogleSignInEnabled: boolean;
  googleSignInError?: boolean;
}) {
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
    <div className="space-y-4">
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
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Google sign-in is not configured. Contact your platform operator.
          </span>
        </div>
      )}

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
    </div>
  );
}