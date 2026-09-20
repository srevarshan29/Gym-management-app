import Link from "next/link";

import { GymDeskLogo } from "@/components/gymdesk-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MemberAuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <GymDeskLogo variant="hero" priority />
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Member Portal
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign-in unavailable</CardTitle>
            <CardDescription>
              No member account found with this email. Contact your gym.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use the login link your gym shared, and sign in with the Google
            account that matches your membership email.{" "}
            <Link href="/member/login" className="text-primary hover:underline">
              Back to portal home
            </Link>
            .
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
