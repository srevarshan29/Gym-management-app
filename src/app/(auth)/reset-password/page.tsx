import Link from "next/link";

import { GymDeskLogo } from "@/components/gymdesk-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ResetPasswordForm } from "./reset-password-form";

type ResetPasswordPageProps = {
  searchParams: { token?: string };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = searchParams.token?.trim() ?? "";

  return (
    <main className="safe-area-top safe-area-x safe-area-bottom flex min-h-dvh items-center justify-center bg-background py-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <GymDeskLogo variant="hero" priority />
          <h1 className="font-display text-2xl font-bold tracking-tight">GymDesk</h1>
          <p className="text-sm text-muted-foreground">Choose a new staff password</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
            <CardDescription>
              Your new password must be at least 8 characters (up to 72 bytes).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {token ? (
              <ResetPasswordForm token={token} />
            ) : (
              <p className="text-sm text-muted-foreground">
                This reset link is invalid. Request a new one from the forgot password page.
              </p>
            )}
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}