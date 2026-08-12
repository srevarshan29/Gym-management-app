"use client";

import { Download } from "lucide-react";

import { LockedLink } from "@/components/navigation/locked-link";
import { Button } from "@/components/ui/button";

type ReportDownloadLinkProps = {
  href: string;
};

export function ReportDownloadLink({ href }: ReportDownloadLinkProps) {
  return (
    <Button asChild className="gap-1 shrink-0">
      <LockedLink href={href}>
        <Download className="h-4 w-4" /> Download CSV
      </LockedLink>
    </Button>
  );
}
