"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { MailX } from "lucide-react";
import { toast } from "sonner";

import { clearAllMemberEmails } from "@/app/actions/members";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={disabled || pending}>
      {pending ? "Clearing..." : "Clear all member emails"}
    </Button>
  );
}

export function ClearAllMemberEmailsSettings({
  memberCount,
  membersWithEmailCount,
}: {
  memberCount: number;
  membersWithEmailCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    clearAllMemberEmails,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Done.");
      setOpen(false);
      setConfirmText("");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const canSubmit = confirmText === "CLEAR";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmText("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/50 text-destructive">
          Clear all member emails…
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailX className="h-5 w-5 shrink-0 text-destructive" />
            Clear all member emails
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Sets the email field to empty on{" "}
                <span className="font-medium text-foreground">
                  all {memberCount} member{memberCount === 1 ? "" : "s"}
                </span>{" "}
                in <span className="font-medium text-foreground">this gym only</span>.
                Names, phones, subscriptions, payments, and portal flags are not
                changed.
              </p>
              {membersWithEmailCount > 0 ? (
                <p>
                  Currently{" "}
                  <span className="font-medium text-foreground">
                    {membersWithEmailCount}
                  </span>{" "}
                  {membersWithEmailCount === 1 ? "has" : "have"} an email on file.
                </p>
              ) : null}
              <p>For testing only. Member portal Google sign-in will not work until emails are added again.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clear-emails-confirm">
              Type <span className="font-mono font-semibold">CLEAR</span> to confirm
            </Label>
            <Input
              id="clear-emails-confirm"
              name="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              placeholder="CLEAR"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton disabled={!canSubmit || memberCount === 0} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
