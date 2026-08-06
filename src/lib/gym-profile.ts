import { withTenant } from "@/lib/db-context";
import {
  DEFAULT_MEMBERSHIP_POLICY_TEXT,
  membershipPolicyTextForSettings,
  normalizeMembershipPolicyText,
} from "@/lib/membership-policy";

export type GymProfileData = {
  id: string | null;
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  ownerNotifyPhone: string | null;
  ownerNotifyEmail: string | null;
  membershipPolicyText: string;
};

const DEFAULT_PROFILE: GymProfileData = {
  id: null,
  name: "My Gym",
  logoUrl: null,
  address: null,
  phone: null,
  ownerNotifyPhone: null,
  ownerNotifyEmail: null,
  membershipPolicyText: DEFAULT_MEMBERSHIP_POLICY_TEXT,
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
    membershipPolicyText: membershipPolicyTextForSettings(
      profile.membershipPolicyText,
    ),
  };
}

/** Active policy for consent checks (null when unset or cleared — no consent required). */
export async function getMembershipPolicyForGym(
  gymId: string,
): Promise<string | null> {
  const profile = await withTenant(gymId, (tx) =>
    tx.gymProfile.findUnique({
      where: { gymId },
      select: { membershipPolicyText: true },
    }),
  );
  return normalizeMembershipPolicyText(profile?.membershipPolicyText);
}

/** Public registration: policy text by gym id (tenant-safe). */
export async function getMembershipPolicyForGymPublic(
  gymId: string,
): Promise<string | null> {
  return getMembershipPolicyForGym(gymId);
}
