"use client";

import { useFormStatus } from "react-dom";

import { memberSignOutAction } from "@/app/actions/member-portal";
import { Button } from "@/components/ui/button";
import { useGuardedServerAction } from "@/hooks/use-guarded-form-action";

export function MemberSignOutButton() {
  const guardedSignOut = useGuardedServerAction(memberSignOutAction);

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
      type="submit"
      variant="outline"
      size="sm"
      className="shrink-0 px-2 sm:px-3"
      disabled={pending}
    >
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
