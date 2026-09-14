import type { MemberGender } from "@prisma/client";

export type PtMemberRow = {
  id: string;
  memberNumber: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  packageName: string | null;
  trainerId: string | null;
  trainerName: string | null;
};

export type PtTrainerGroup = {
  trainerId: string | null;
  trainerName: string;
  members: PtMemberRow[];
};
