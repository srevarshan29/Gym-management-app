"use client";

import { Home } from "lucide-react";

import { LockedLink } from "@/components/navigation/locked-link";
import { Button } from "@/components/ui/button";

export function RegistrationHomeLink() {
  return (
    <Button asChild variant="outline" className="mt-8 w-full">
      <LockedLink href="/">
        <Home className="h-4 w-4" />
        Back to Home
      </LockedLink>
    </Button>
  );
}
