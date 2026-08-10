import { notFound } from "next/navigation";

import { PublicRegistrationForm } from "@/components/public-registration-form";
import { getGymProfile, getMembershipPolicyForGymPublic } from "@/lib/gym-profile";
import { getGymByRegistrationToken } from "@/lib/registration";

export default async function PublicRegisterPage({
  params,
}: {
  params: { token: string };
}) {
  const gym = await getGymByRegistrationToken(params.token);
  if (!gym) notFound();

  const [profile, membershipPolicyText] = await Promise.all([
    getGymProfile(gym.id),
    getMembershipPolicyForGymPublic(gym.id),
  ]);

  return (
    <PublicRegistrationForm
      token={params.token}
      gymName={profile.name || gym.name}
      logoUrl={profile.logoUrl}
      membershipPolicyText={membershipPolicyText}
    />
  );
}
