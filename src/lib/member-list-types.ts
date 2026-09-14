import type { MemberGender } from "@prisma/client";

import type { SubscriptionStatus } from "@/lib/subscription";

export type PendingMember = {
  memberId: string;
  memberNumber: number;
  memberName: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  subscriptionId: string;
  packageName: string;
  subsAmount: number;
  paidAmount: number;
  amountDue: number;
  endDate: Date;
  status: SubscriptionStatus;
};

export type MembershipRenewalRow = {
  id: string;
  memberNumber: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  packageName: string;
  endDate: Date;
};
