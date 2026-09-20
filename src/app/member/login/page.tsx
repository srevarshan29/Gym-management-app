import Link from "next/link";

import { GymDeskLogo } from "@/components/gymdesk-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MemberLoginIndexPage() {
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
            <CardTitle>Get your login link</CardTitle>
            <CardDescription>
              Ask your gym for their member portal link (QR code or URL). Each
              gym has its own secure login page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Staff sign in{" "}
            <Link href="/login" className="text-primary hover:underline">
              here
            </Link>
            .
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
