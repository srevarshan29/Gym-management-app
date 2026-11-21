"use client";

import React, { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { requestStaffPasswordResetAction } from "@/app/actions/staff-password-reset";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState = { status: "idle" as const };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending..." : "Send reset link"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const guardedAction = useGuardedFormAction(requestStaffPasswordResetAction);
  const [state, formAction] = useFormState(guardedAction, initialState);
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const email = String(new FormData(form).get("email") ?? "").trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          event.preventDefault();
          setClientError("Enter a valid email address.");
          return;
        }
        setClientError(null);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="owner@gym.test"
          autoComplete="email"
          required
        />
      </div>

      {clientError ? (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{clientError}</span>
        </div>
      ) : null}

      {state?.status === "success" ? (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <span>{state.message}</span>
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