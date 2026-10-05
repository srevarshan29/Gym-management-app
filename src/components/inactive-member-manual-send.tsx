"use client";

import * as React from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";

import {
  getInactiveMemberBulkRecipientCountAction,
  sendInactiveMemberRemindersBulkAction,
} from "@/app/actions/inactive-member-reminders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  initialRecipientCount: number;
  channelEnabled: boolean;
};

export function InactiveMemberManualSendButton({
  initialRecipientCount,
  channelEnabled,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [recipientCount, setRecipientCount] = React.useState(
    initialRecipientCount,
  );

  React.useEffect(() => {
    setRecipientCount(initialRecipientCount);
  }, [initialRecipientCount]);

  function openConfirm() {
    startTransition(async () => {
      const refreshed = await getInactiveMemberBulkRecipientCountAction();
      if (refreshed.ok && refreshed.data) {
        setRecipientCount(refreshed.data.count);
      }
      setOpen(true);
    });
  }

  function confirmBulkSend() {
    startTransition(async () => {
      const result = await sendInactiveMemberRemindersBulkAction();
      setOpen(false);
      if (result.ok) {
        toast.success(result.message ?? "Inactive member emails sent.");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!channelEnabled) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-1.5"
        disabled={pending || recipientCount === 0}
        onClick={openConfirm}
      >
        <Send className="h-4 w-4" />
        Send to all inactive members
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send inactive member emails</DialogTitle>
            <DialogDescription>
              Send to {recipientCount} inactive member
              {recipientCount === 1 ? "" : "s"}?
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Only active members with email who meet your inactivity threshold are
            included. Members already emailed for the same visit period are
            skipped.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || recipientCount === 0}
              onClick={confirmBulkSend}
            >
              {pending ? "Sending…" : "Send emails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
