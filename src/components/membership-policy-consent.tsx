"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";

type Props = {
  policyText: string;
};

export function MembershipPolicyConsent({ policyText }: Props) {
  const [agreed, setAgreed] = React.useState(false);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-medium">Membership policy</p>
      <div
        className="max-h-48 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-muted-foreground"
        role="document"
        aria-label="Gym membership policy"
      >
        {policyText}
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="agreeMembershipPolicy"
          value="1"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
        />
        <span>I have read and agree to the gym&apos;s membership policy</span>
      </label>
    </div>
  );
}
