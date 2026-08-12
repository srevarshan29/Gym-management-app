"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";

import { deleteMember } from "@/app/actions/members";
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
import { useGuardedServerAction } from "@/hooks/use-guarded-form-action";

export function DeleteMemberButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const guardedDelete = useGuardedServerAction(deleteMember);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete member</DialogTitle>
          <DialogDescription>
            This permanently deletes {memberName} along with their subscription
            and payment history. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <form action={guardedDelete}>
            <input type="hidden" name="id" value={memberId} />
            <SubmitButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Deleting..." : "Delete permanently"}
    </Button>
  );
}
