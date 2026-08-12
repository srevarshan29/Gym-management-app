"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { deleteAllGymMembers } from "@/app/actions/members";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
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
      {pending ? "Deleting..." : "Delete all members"}
    </Button>
  );
}

export function BulkDeleteMembersSettings({
  memberCount,
}: {
  memberCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const guardedAction = useGuardedFormAction(deleteAllGymMembers);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
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

  const canSubmit = confirmText === "DELETE";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmText("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete all members…
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Delete all members
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                This permanently removes{" "}
                <span className="font-medium text-foreground">
                  {memberCount} member{memberCount === 1 ? "" : "s"}
                </span>{" "}
                in <span className="font-medium text-foreground">this gym only</span>,
                including subscriptions, payments, receipts, and diet/workout
                plans. Packages, staff, visitors, and other gyms are not affected.
              </p>
              <p>This cannot be undone. For testing and reset purposes only.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-delete-confirm">
              Type <span className="font-mono font-semibold">DELETE</span> to
              confirm
            </Label>
            <Input
              id="bulk-delete-confirm"
              name="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              placeholder="DELETE"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton disabled={!canSubmit} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
