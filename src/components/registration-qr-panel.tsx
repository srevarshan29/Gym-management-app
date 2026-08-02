"use client";

import * as React from "react";
import { toast } from "sonner";
import QRCode from "react-qr-code";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function RegistrationQrPanel({
  registrationUrl,
}: {
  registrationUrl: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      toast.success("Registration link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration QR code</CardTitle>
        <CardDescription>
          Show this at the front desk or print it for prospective members to scan
          and self-register.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="rounded-xl border bg-white p-4 print:border-0 print:p-0">
          <QRCode value={registrationUrl} size={180} />
        </div>
        <div className="w-full flex-1 space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Shareable link</p>
            <div className="flex gap-2">
              <Input readOnly value={registrationUrl} className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={onCopy}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Scanning opens a public form. Submissions appear below as pending
            registrations for staff to convert into full members.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
