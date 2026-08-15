"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type ReportDownloadLinkProps = {
  href: string;
};

/**
 * File downloads must not use LockedLink / router.push.
 * Those treat the href as an in-app navigation, leave the lock set
 * (the reports URL never becomes the current route), and block the next click.
 */
export function ReportDownloadLink({ href }: ReportDownloadLinkProps) {
  return (
    <Button asChild className="gap-1 shrink-0">
      <a href={href} download>
        <Download className="h-4 w-4" /> Download CSV
      </a>
    </Button>
  );
}
