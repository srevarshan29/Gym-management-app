"use client";

import React, { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";

import { completeStaffPasswordResetAction } from "@/app/actions/staff-password-reset";
import { PasswordInputWithToggle } from "@/components/auth/password-input-with-toggle";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import {
  STAFF_PASSWORD_MAX_BYTES,
  STAFF_PASSWORD_MIN_LENGTH,
} from "@/lib/staff-auth/staff-password-reset";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initialState = { status: "idle" as const };

function validateClientPassword(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  if (password.length < STAFF_PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${STAFF_PASSWORD_MIN_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(password).length > STAFF_PASSWORD_MAX_BYTES) {
    return `Password must be at most ${STAFF_PASSWORD_MAX_BYTES} bytes.`;
  }
  return null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Saving..." : "Update password"}
    </Button>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const guardedAction = useGuardedFormAction(completeStaffPasswordResetAction);
  const [state, formAction] = useFormState(guardedAction, initialState);
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const formData = new FormData(form);
        const password = String(formData.get("password") ?? "");
        const confirmPassword = String(formData.get("confirmPassword") ?? "");
        const validation = validateClientPassword(password, confirmPassword);
        if (validation) {
          event.preventDefault();
          setClientError(validation);
          return;
        }
        setClientError(null);
      }}
    >
      <input type="hidden" name="token" value={token} readOnly />

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInputWithToggle
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          minLength={STAFF_PASSWORD_MIN_LENGTH}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInputWithToggle
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          minLength={STAFF_PASSWORD_MIN_LENGTH}
        />
      </div>

      {clientError ? (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{clientError}</span>
        </div>
      ) : null}

      {state?.status === "error" ? (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{state.message}</span>
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}