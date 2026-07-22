"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateMyProfile } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";

export function AccountSettingsForm({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    updateMyProfile,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Profile updated.");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="account-name">Display name</Label>
        <Input
          id="account-name"
          name="name"
          defaultValue={name}
          placeholder="Your name"
          required
        />
        <p className="text-xs text-muted-foreground">
          Shown in the header and on &quot;Added by&quot; / &quot;Logged by&quot;
          labels across the app.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="account-email">Email</Label>
        <Input id="account-email" value={email} disabled />
        <p className="text-xs text-muted-foreground">
          Email cannot be changed here. Contact your gym owner if you need a new
          login address.
        </p>
      </div>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save name"}
    </Button>
  );
}
