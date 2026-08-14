"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { writeOffSubscriptionDues } from "@/app/actions/subscriptions";
import { useActionLock } from "@/hooks/use-action-lock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

export function WriteOffDuesButton({
  subscriptionId,
  amountDue,
  packageName,
}: {
  subscriptionId: string;
  amountDue: number;
  packageName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { run, isPending } = useActionLock();
  const router = useRouter();

  function onConfirm() {
    run(async () => {
      const result = await writeOffSubscriptionDues(subscriptionId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Write off
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write off outstanding dues</DialogTitle>
          <DialogDescription>
            This marks {formatCurrency(amountDue)} remaining on {packageName} as
            written off. It does not record a payment and does not change
            existing payment history.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Writing off..." : "Write off balance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
