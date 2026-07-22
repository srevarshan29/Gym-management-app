import { withTenant } from "@/lib/db-context";

export type GymProfileData = {
  id: string | null;
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  ownerNotifyPhone: string | null;
  ownerNotifyEmail: string | null;
};

const DEFAULT_PROFILE: GymProfileData = {
  id: null,
  name: "My Gym",
  logoUrl: null,
  address: null,
  phone: null,
  ownerNotifyPhone: null,
  ownerNotifyEmail: null,
};

/** Each gym has at most one profile row; returns sensible defaults if none exists yet. */
export async function getGymProfile(gymId: string): Promise<GymProfileData> {
  const profile = await withTenant(gymId, (tx) =>
    tx.gymProfile.findUnique({ where: { gymId } }),
  );
  if (!profile) return DEFAULT_PROFILE;

  return {
    id: profile.id,
    name: profile.name,
    logoUrl: profile.logoUrl,
    address: profile.address,
    phone: profile.phone,
    ownerNotifyPhone: profile.ownerNotifyPhone,
    ownerNotifyEmail: profile.ownerNotifyEmail,
  };
}
