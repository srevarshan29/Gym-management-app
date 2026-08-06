import { notFound } from "next/navigation";

import { PublicRegistrationForm } from "@/components/public-registration-form";
import { getGymByRegistrationToken } from "@/lib/registration";
import { getMembershipPolicyForGymPublic } from "@/lib/gym-profile";

export default async function PublicRegisterPage({
  params,
}: {
  params: { token: string };
}) {
  const gym = await getGymByRegistrationToken(params.token);
  if (!gym) notFound();

  const membershipPolicyText = await getMembershipPolicyForGymPublic(gym.id);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <PublicRegistrationForm
          token={params.token}
          gymName={gym.name}
          membershipPolicyText={membershipPolicyText}
        />
      </div>
    </main>
  );
}
