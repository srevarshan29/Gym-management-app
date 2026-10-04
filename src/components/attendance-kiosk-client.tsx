"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";

import {
  checkInByMemberNumberAction,
  type CheckInActionData,
} from "@/app/actions/attendance";
import { GymDeskLogo } from "@/components/gymdesk-logo";
import { AttendanceKioskSuccess } from "@/components/attendance-kiosk-success";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import type { AttendanceCheckInResult } from "@/lib/attendance/types";

const KIOSK_RESET_MS = 4500;

type KioskPhase = "input" | "success" | "error";

function kioskErrorMessage(
  state: ActionResult<CheckInActionData> | undefined,
): string | null {
  if (state && !state.ok) {
    return state.error;
  }
  if (!state?.ok || !state.data) return null;
  const data = state.data;
  if (data.status === "not_found") {
    return "Member number not found";
  }
  if (data.status === "membership_expired") {
    return "Your membership has expired";
  }
  return null;
}

function CheckInSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="h-11 min-w-[10rem] rounded-xl px-8 text-base font-semibold shadow-[0_0_20px_hsl(var(--primary)/0.35)] sm:h-12 sm:text-lg"
    >
      {pending ? "Checking in…" : "Check In"}
    </Button>
  );
}

type AttendanceKioskClientProps = {
  canManage: boolean;
};

export function AttendanceKioskClient({ canManage }: AttendanceKioskClientProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [memberNumber, setMemberNumber] = React.useState("");
  const [phase, setPhase] = React.useState<KioskPhase>("input");
  const [successData, setSuccessData] = React.useState<
    Extract<AttendanceCheckInResult, { status: "success" }> | null
  >(null);

  const guardedAction = useGuardedFormAction(checkInByMemberNumberAction);
  const [state, formAction] = useFormState<
    ActionResult<CheckInActionData> | undefined,
    FormData
  >(guardedAction, undefined);

  const clearResetTimer = React.useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const resetToInput = React.useCallback(() => {
    clearResetTimer();
    setPhase("input");
    setSuccessData(null);
    setMemberNumber("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [clearResetTimer]);

  React.useEffect(() => {
    inputRef.current?.focus();
    return () => clearResetTimer();
  }, [clearResetTimer]);

  React.useEffect(() => {
    if (!state?.ok || !state.data) {
      if (state && !state.ok) {
        setPhase("error");
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      return;
    }

    if (state.data.status === "success") {
      setSuccessData(state.data);
      setPhase("success");
      clearResetTimer();
      resetTimerRef.current = setTimeout(() => {
        resetToInput();
      }, KIOSK_RESET_MS);
    } else if (
      state.data.status === "not_found" ||
      state.data.status === "membership_expired"
    ) {
      setPhase("error");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [state, clearResetTimer, resetToInput]);

  const errorMessage = phase === "error" ? kioskErrorMessage(state) : null;
  const showSuccess = phase === "success" && successData !== null;

  if (!canManage) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-muted-foreground">
        You do not have permission to use check-in.
      </div>
    );
  }

  return (
    <div
      data-kiosk-route
      className="relative flex min-h-0 flex-1 flex-col bg-background text-foreground"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_55%)]" />

      <div className="relative mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col px-4 pt-0 pb-2 sm:pb-3">
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center"
          aria-live="polite"
        >
          {showSuccess ? (
            <AttendanceKioskSuccess
              data={successData}
              onContinue={resetToInput}
            />
          ) : (
            <div className="flex w-full flex-col items-center gap-3 sm:gap-4">
              <header className="flex flex-col items-center gap-1 text-center">
                <GymDeskLogo
                  variant="mark"
                  priority
                  className="h-10 w-10 sm:h-11 sm:w-11"
                  imageClassName="max-h-10 max-w-10 sm:max-h-11 sm:max-w-11"
                />
                <p className="font-display text-[1.75rem] font-bold leading-tight tracking-tight sm:text-[2rem]">
                  Welcome
                </p>
              </header>

              <div className="space-y-0.5 text-center">
                <h1 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  Check in to your gym
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your Member Number
                </p>
              </div>

              <form action={formAction} className="w-full space-y-2.5 sm:space-y-3">
                <Input
                  ref={inputRef}
                  id="memberNumber"
                  name="memberNumber"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0001"
                  value={memberNumber}
                  onChange={(e) => setMemberNumber(e.target.value)}
                  className="h-14 border-input bg-muted/40 text-center font-display text-2xl tracking-widest shadow-inner ring-primary/20 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/40 sm:h-16 sm:text-3xl"
                  aria-invalid={errorMessage ? true : undefined}
                  aria-describedby={errorMessage ? "kiosk-error" : "kiosk-hint"}
                />

                {errorMessage ? (
                  <p
                    id="kiosk-error"
                    role="alert"
                    className="text-center text-base font-medium text-destructive sm:text-lg"
                  >
                    {errorMessage}
                  </p>
                ) : null}

                <p
                  id="kiosk-hint"
                  className="text-center text-xs text-muted-foreground sm:text-sm"
                >
                  Press Enter to Check In
                </p>

                <div className="flex justify-center">
                  <CheckInSubmitButton />
                </div>
              </form>

              <p className="max-w-md text-center text-xs text-muted-foreground/80">
                Enter your member number to get started
              </p>
            </div>
          )}
        </div>

        <footer className="shrink-0 pt-2 text-center">
          <Link
            href="/operations/attendance/log"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Staff attendance log
          </Link>
        </footer>
      </div>
    </div>
  );
}
