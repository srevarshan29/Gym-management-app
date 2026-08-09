"use client";

import * as React from "react";

import { startMemberGoogleSignIn } from "@/app/actions/member-portal";
import { Button } from "@/components/ui/button";

export function MemberLoginForm({
  gymToken,
  gymName,
}: {
  gymToken: string;
  gymName: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onGoogleSignIn() {
    setError(null);
    startTransition(async () => {
      try {
        await startMemberGoogleSignIn(gymToken);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not start sign-in. Try again.",
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Sign in at{" "}
        <span className="font-medium text-foreground">{gymName}</span>
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Use the same Google account as the email on file with your gym.
      </p>
      {error ? <p className="text-sm text-destructive text-center">{error}</p> : null}
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={onGoogleSignIn}
      >
        {pending ? "Redirecting..." : "Continue with Google"}
      </Button>
    </div>
  );
}
