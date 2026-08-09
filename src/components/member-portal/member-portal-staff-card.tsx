"use client";

import * as React from "react";
import { toast } from "sonner";

import { enableMemberPortalAccess } from "@/app/actions/member-portal-invite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MemberPortalStaffCard({
  memberId,
  portalActive,
  hasEmail,
}: {
  memberId: string;
  portalActive: boolean;
  hasEmail: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [loginUrl, setLoginUrl] = React.useState<string | null>(null);

  function onEnable() {
    startTransition(async () => {
      const res = await enableMemberPortalAccess(memberId);
      if (res.ok) {
        toast.success(res.message ?? "Done.");
        if (res.data?.loginUrl) setLoginUrl(res.data.loginUrl);
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
        <p className="text-sm">
          Status:{" "}
          <span className="font-medium">
            {portalActive ? "Active" : "Not enabled"}
          </span>
        </p>
        {!hasEmail ? (
          <p className="text-sm text-muted-foreground">
            Add an email on the member profile to enable Google sign-in.
          </p>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={pending || !hasEmail}
          onClick={onEnable}
        >
          {pending
            ? "Working..."
            : portalActive
              ? "Copy portal login link"
              : "Enable member portal"}
        </Button>
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
