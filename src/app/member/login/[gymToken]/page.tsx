import { notFound } from "next/navigation";
import { GymDeskLogo } from "@/components/gymdesk-logo";
import { getGymByRegistrationToken } from "@/lib/member-portal/access";
import { MemberLoginForm } from "@/components/member-portal/member-login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MemberLoginPage({
  params,
}: {
  params: { gymToken: string };
}) {
  const gym = await getGymByRegistrationToken(params.gymToken);
  if (!gym) notFound();

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
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Sign in with Google using the email address your gym has on file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MemberLoginForm gymToken={gym.registrationToken} gymName={gym.name} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
