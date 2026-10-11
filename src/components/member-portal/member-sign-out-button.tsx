"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";

import { memberSignOutAction } from "@/app/actions/member-portal";
import { useSharedNavigationLock } from "@/components/navigation/navigation-lock-provider";
import { Button } from "@/components/ui/button";
import { useGuardedServerAction } from "@/hooks/use-guarded-form-action";
import { prepareMemberSignOutLeave } from "@/lib/member-portal/member-sign-out-before-leave";

export function MemberSignOutButton() {
  const pathname = usePathname();
  const { runRegisteredBeforeLeave } = useSharedNavigationLock();
  const guardedSignOut = useGuardedServerAction(memberSignOutAction);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [savingBeforeSignOut, setSavingBeforeSignOut] = React.useState(false);
  const signOutAttemptRef = React.useRef(false);

  async function onSignOutRequest() {
    if (signOutAttemptRef.current) return;
    signOutAttemptRef.current = true;
    setSavingBeforeSignOut(true);
    try {
      const allowed = await prepareMemberSignOutLeave(
        pathname,
        runRegisteredBeforeLeave,
      );
      if (!allowed) return;
      formRef.current?.requestSubmit();
    } finally {
      setSavingBeforeSignOut(false);
      signOutAttemptRef.current = false;
    }
  }

  return (
    <form ref={formRef} action={guardedSignOut}>
      <SubmitButton
        savingBeforeSignOut={savingBeforeSignOut}
        onSignOutRequest={() => void onSignOutRequest()}
      />
    </form>
  );
}

function SubmitButton({
  savingBeforeSignOut,
  onSignOutRequest,
}: {
  savingBeforeSignOut: boolean;
  onSignOutRequest: () => void;
}) {
  const { pending } = useFormStatus();
  const busy = pending || savingBeforeSignOut;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 px-2 sm:px-3"
      disabled={busy}
      onClick={onSignOutRequest}
    >
      {savingBeforeSignOut
        ? "Saving…"
        : pending
          ? "Signing out..."
          : "Sign out"}
    </Button>
  );
}
