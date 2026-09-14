import type { MemberGender } from "@prisma/client";

import type { VisitorStatus } from "@/lib/visitor-types";

export type QrRegistrationListItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: MemberGender | null;
  status: VisitorStatus;
  createdAt: Date;
};

/** Serializable row for client components (dates normalized server-side). */
export type QrRegistrationRow = Omit<QrRegistrationListItem, "createdAt"> & {
  createdAt: string;
};
