"use client";

import * as React from "react";
import { toast } from "sonner";

import { useActionLock } from "@/hooks/use-action-lock";

import {
  enableMemberPortalAccess,
  getMemberPortalLoginLink,
  resendMemberPortalInvitation,
} from "@/app/actions/member-portal-invite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MemberPortalInvitationSummary } from "@/lib/member-portal-invitation/types";
import { formatInvitationStatusLabel } from "@/lib/member-portal-invitation/types";
import { formatDateTime } from "@/lib/utils";

export function MemberPortalStaffCard({
  memberId,
  portalActive,
  hasEmail,
  invitation,
}: {
  memberId: string;
  portalActive: boolean;
  hasEmail: boolean;
  invitation: MemberPortalInvitationSummary | null;
}) {
  const { run, isPending: pending } = useActionLock();
  const [loginUrl, setLoginUrl] = React.useState<string | null>(null);

  const invitationStatus = invitation?.status ?? null;
  const recipientEmail = invitation?.recipientEmail ?? null;
  const lastAttemptAt = invitation?.lastAttemptAt ?? null;

  function onEnable() {
    if (pending) return;
    run(async () => {
      const res = await enableMemberPortalAccess(memberId);
      if (res.ok) {
        toast.success(res.message ?? "Done.");
        if (res.data?.loginUrl) setLoginUrl(res.data.loginUrl);
      } else {
        toast.error(res.error);
      }
    });
  }

  function onCopyLink() {
    if (pending) return;
    run(async () => {
      const res = await getMemberPortalLoginLink(memberId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const url = res.data?.loginUrl;
      if (!url) {
        toast.error("Could not load portal link.");
        return;
      }
      setLoginUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Portal link copied.");
      } catch {
        toast.success("Portal link ready — copy it from the box below.");
      }
    });
  }

  function onResend() {
    if (pending) return;
    run(async () => {
      const res = await resendMemberPortalInvitation(memberId);
      if (res.ok) {
        toast.success(res.message ?? "Invitation sent.");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Member portal</CardTitle>
        <CardDescription>
          Members sign in with Google using the email on their profile. Enable
          access here, then share your gym&apos;s login link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Access</dt>
            <dd className="font-medium">
              {portalActive ? "Active" : "Not enabled"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Invitation</dt>
            <dd className="font-medium">
              {formatInvitationStatusLabel(invitationStatus)}
            </dd>
          </div>
          {recipientEmail ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Recipient</dt>
              <dd className="font-medium break-all">{recipientEmail}</dd>
            </div>
          ) : null}
          {lastAttemptAt ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Last invitation attempt</dt>
              <dd className="font-medium">{formatDateTime(lastAttemptAt)}</dd>
            </div>
          ) : null}
        </dl>
        {!hasEmail ? (
          <p className="text-sm text-muted-foreground">
            Add an email on the member profile to enable Google sign-in.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {!portalActive ? (
            <Button
              type="button"
              size="sm"
              disabled={pending || !hasEmail}
              onClick={onEnable}
            >
              {pending ? "Working..." : "Enable member portal"}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={onCopyLink}
              >
                {pending ? "Working..." : "Copy portal link"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending || !hasEmail}
                onClick={onResend}
              >
                {pending ? "Working..." : "Resend invitation"}
              </Button>
            </>
          )}
        </div>
        {loginUrl ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-xs break-all">
            <p className="mb-1 font-medium">Login link</p>
            <p>{loginUrl}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
