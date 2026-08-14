import type { Prisma } from "@prisma/client";

import { normalizeMemberEmail } from "@/lib/member-portal/constants";

export const DUPLICATE_MEMBER_EMAIL_MESSAGE =
  "A member with this email already exists in this gym.";

type MemberEmailLookupClient = {
  member: {
    findMany: Prisma.TransactionClient["member"]["findMany"];
  };
};

/** Case-insensitive members in one gym with this email. Null/blank is ignored. */
export async function findGymMembersByEmail(
  db: MemberEmailLookupClient,
  tenantGymId: string,
  email: string,
  options?: {
    excludeMemberId?: string;
    portalEnabledOnly?: boolean;
  },
) {
  const normalizedEmail = normalizeMemberEmail(email);
  if (!normalizedEmail) return [];

  return db.member.findMany({
    where: {
      gymId: tenantGymId,
      email: { equals: normalizedEmail, mode: "insensitive" },
      ...(options?.excludeMemberId
        ? { id: { not: options.excludeMemberId } }
        : {}),
      ...(options?.portalEnabledOnly
        ? { portalEnabledAt: { not: null } }
        : {}),
    },
    select: {
      id: true,
      gymId: true,
      name: true,
      memberNumber: true,
    },
  });
}
