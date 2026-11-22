import { isStaffGoogleSignInConfigured } from "@/lib/staff-auth/google-sign-in";
import { GymDeskLogo } from "@/components/gymdesk-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const googleSignInError = searchParams?.error === "GoogleSignInDenied";
  return (
    <main className="safe-area-top safe-area-x safe-area-bottom flex min-h-dvh items-center justify-center bg-background py-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <GymDeskLogo variant="hero" priority />
          <h1 className="font-display text-2xl font-bold tracking-tight">GymDesk</h1>
          <p className="text-sm text-muted-foreground">
            Gym management for staff
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Owners, admins, staff and platform super administrators can sign in
              with Google. Super admins can also use email and password below as
              a temporary fallback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              staffGoogleSignInEnabled={isStaffGoogleSignInConfigured()}
              googleSignInError={googleSignInError}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
