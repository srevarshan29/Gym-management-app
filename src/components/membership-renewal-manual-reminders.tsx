"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";

import {
  getManualRenewalBulkRecipientCountAction,
  sendManualRenewalReminderAction,
  sendManualRenewalRemindersBulkAction,
} from "@/app/actions/manual-renewal-reminders";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ManualRenewalReminderVariant } from "@/lib/manual-renewal-reminders/types";

type Props = {
  variant: ManualRenewalReminderVariant;
  query: string;
  bulkEmailRecipientCount: number;
};

export function MembershipRenewalBulkReminderButton({
  variant,
  query,
  bulkEmailRecipientCount,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [recipientCount, setRecipientCount] = React.useState(
    bulkEmailRecipientCount,
  );

  React.useEffect(() => {
    setRecipientCount(bulkEmailRecipientCount);
  }, [bulkEmailRecipientCount]);

  function openConfirm() {
    startTransition(async () => {
      const refreshed = await getManualRenewalBulkRecipientCountAction(
        variant,
        query,
      );
      if (refreshed.ok && refreshed.data) {
        setRecipientCount(refreshed.data.count);
      }
      setOpen(true);
    });
  }

  function confirmBulkSend() {
    startTransition(async () => {
      const result = await sendManualRenewalRemindersBulkAction(variant, query);
      setOpen(false);
      if (result.ok) {
        toast.success(result.message ?? "Bulk reminders sent.");
      } else {
        toast.error(result.error);
      }
    });
  }

  if (bulkEmailRecipientCount === 0) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-1.5"
        disabled={pending}
        onClick={openConfirm}
      >
        <Send className="h-4 w-4" />
        Send email to all
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send renewal reminders</DialogTitle>
            <DialogDescription>
              Send renewal reminder to {recipientCount} member
              {recipientCount === 1 ? "" : "s"}?
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Only members with an email on file receive a message. Manual sends do
            not affect automated expiry reminders.
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
              {pending ? "Sending…" : "Send reminders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type RowProps = {
  memberId: string;
  memberName: string;
  endDateIso: string;
  email: string | null;
  variant: ManualRenewalReminderVariant;
};

export function MembershipRenewalRowReminderButton({
  memberId,
  memberName,
  endDateIso,
  email,
  variant,
}: RowProps) {
  const [pending, startTransition] = React.useTransition();

  function sendOne() {
    startTransition(async () => {
      const result = await sendManualRenewalReminderAction(
        memberId,
        endDateIso,
        variant,
      );
      if (result.ok) {
        toast.success(result.message ?? `Reminder sent to ${memberName}.`);
      } else {
        toast.error(result.error);
      }
    });
  }

  const hasEmail = Boolean(email?.trim());

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1"
      disabled={!hasEmail || pending}
      title={hasEmail ? undefined : "Add an email on the member profile first"}
      onClick={sendOne}
    >
      <Mail className="h-3.5 w-3.5" />
      {pending ? "Sending…" : "Send reminder"}
    </Button>
  );
}
