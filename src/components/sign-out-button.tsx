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
    <Button variant="ghost" size="sm" type="submit" className="gap-2" disabled={pending}>
      <LogOut className="h-4 w-4" />
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
