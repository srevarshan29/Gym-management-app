"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RegistrationShellProps = {
  gymName: string;
  logoUrl?: string | null;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
};

export function RegistrationShell({
  gymName,
  logoUrl,
  showBack,
  onBack,
  children,
}: RegistrationShellProps) {
  return (
    <main className="flex min-h-screen flex-col bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-md flex-1">
        <div className="relative mb-6 text-center">
          {showBack ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onBack}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : null}

          <div className="flex flex-col items-center gap-2 pt-1">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${gymName} logo`}
                width={120}
                height={40}
                className="max-h-10 w-auto object-contain"
                unoptimized
              />
            ) : (
              <span className="font-display text-2xl font-bold tracking-tight text-primary">
                {gymName}
              </span>
            )}
            <h1 className="font-display text-lg font-semibold text-foreground">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Register at {gymName}
            </p>
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}

export function RegistrationStepPanel({
  hidden,
  children,
  className,
}: {
  hidden?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(hidden && "hidden", className)}
      aria-hidden={hidden}
    >
      {children}
    </div>
  );
}
