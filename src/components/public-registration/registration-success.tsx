import Link from "next/link";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";

type RegistrationSuccessProps = {
  message?: string;
};

export function RegistrationSuccess({ message }: RegistrationSuccessProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-glow">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-10 w-10 text-primary-foreground"
              aria-hidden
            >
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground">
          Thank you!
        </h1>
        <p className="mt-2 text-sm font-medium text-primary">
          Your registration was successful.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {message ??
            "Our front desk team will confirm your registration shortly."}
        </p>

        <Button asChild variant="outline" className="mt-8 w-full">
          <Link href="/">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </main>
  );
}
