"use client";

import { useFormStatus } from "react-dom";
import { LogOut } from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { useGuardedServerAction } from "@/hooks/use-guarded-form-action";

export function SignOutButton() {
  const guardedSignOut = useGuardedServerAction(signOutAction);

  return (
    <form action={guardedSignOut}>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      variant="ghost"
      size="sm"
      type="submit"
      className="gap-2 px-2 sm:px-3"
      disabled={pending}
    >
      <LogOut className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only">
        {pending ? "Signing out..." : "Sign out"}
      </span>
    </Button>
  );
}
