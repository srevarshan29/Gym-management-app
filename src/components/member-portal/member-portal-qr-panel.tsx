"use client";

import * as React from "react";
import { toast } from "sonner";
import QRCode from "react-qr-code";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function MemberPortalQrPanel({
  portalLoginUrl,
}: {
  portalLoginUrl: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const qrContainerRef = React.useRef<HTMLDivElement>(null);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(portalLoginUrl);
      setCopied(true);
      toast.success("Member portal link copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link.");
    }
  }

  function onPrint() {
    window.print();
  }

  async function onDownloadPng() {
    const svg = qrContainerRef.current?.querySelector("svg");
    if (!svg) {
      toast.error("QR code is not ready.");
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          toast.error("Could not export QR code.");
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        canvas.toBlob((png) => {
          if (!png) {
            toast.error("Could not export QR code.");
            return;
          }
          const link = document.createElement("a");
          link.href = URL.createObjectURL(png);
          link.download = "member-portal-qr.png";
          link.click();
          URL.revokeObjectURL(link.href);
          toast.success("QR code downloaded.");
        }, "image/png");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast.error("Could not export QR code.");
      };
      img.src = url;
    } catch {
      toast.error("Could not export QR code.");
    }
  }

  return (
    <Card id="member-portal-qr-print" className="print:border-0 print:shadow-none">
      <CardHeader className="print:pb-2">
        <CardTitle>Member Portal QR</CardTitle>
        <CardDescription>
          Permanent QR for your gym. Members scan it to open your gym&apos;s sign-in
          page, then use Google with the email your staff has on file. Each member
          sees their own portal after signing in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-start print:flex-col print:items-center">
        <div
          ref={qrContainerRef}
          className="rounded-xl border bg-white p-4 print:border-0 print:p-0"
        >
          <QRCode value={portalLoginUrl} size={180} />
        </div>
        <div className="w-full flex-1 space-y-3 print:hidden">
          <div className="space-y-2">
            <p className="text-sm font-medium">Portal link</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={portalLoginUrl} className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={onCopy}>
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onPrint}>
              Print
            </Button>
            <Button type="button" variant="outline" onClick={onDownloadPng}>
              Download PNG
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This link stays the same unless you regenerate it in a future update.
            It does not identify individual members.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
