import type { MemberGender } from "@/lib/firestore/types";

import { getRepositories, platformContext } from "@/lib/firestore";
import { getGymStaffOptions } from "@/lib/staff";
import type { PtMemberRow, PtTrainerGroup } from "@/lib/pt-member-types";

export type { PtMemberRow, PtTrainerGroup } from "@/lib/pt-member-types";

export type PtMembersPageData = {
  totalPtMembers: number;
  trainersEngaged: number;
  groups: PtTrainerGroup[];
  staffOptions: { id: string; name: string }[];
};

function toPtMemberRow(
  member: {
    id: string;
    memberNumber: number;
    name: string;
    phone: string;
    photoUrl: string | null;
    gender: MemberGender;
    currentPackageName: string | null;
    trainerId: string | null;
  },
  trainerName: string | null,
): PtMemberRow {
  return {
    id: member.id,
    memberNumber: member.memberNumber,
    name: member.name,
    phone: member.phone,
    photoUrl: member.photoUrl,
    gender: member.gender,
    packageName: member.currentPackageName,
    trainerId: member.trainerId,
    trainerName,
  };
}

export async function getPtMembersPageData(
  tenantGymId: string,
): Promise<PtMembersPageData> {
  const { members, users } = getRepositories();
  const [staffOptions, ptMemberDocs] = await Promise.all([
    getGymStaffOptions(tenantGymId),
    members.listAllPtMembers(platformContext, tenantGymId),
  ]);

  const trainerIds = [
    ...new Set(
      ptMemberDocs
        .map((m) => m.trainerId)
        .filter((id): id is string => id != null),
    ),
  ];

  const trainerNameById = new Map<string, string>();
  await Promise.all(
    trainerIds.map(async (trainerId) => {
      const user = await users.findById(platformContext, trainerId);
      if (user) trainerNameById.set(trainerId, user.name);
    }),
  );

  const rows = ptMemberDocs.map((member) =>
    toPtMemberRow(
      member,
      member.trainerId
        ? (trainerNameById.get(member.trainerId) ?? null)
        : null,
    ),
  );

  const groupMap = new Map<string | null, PtMemberRow[]>();
  for (const row of rows) {
    const key = row.trainerId;
    const list = groupMap.get(key) ?? [];
    list.push(row);
    groupMap.set(key, list);
  }

  const assignedTrainerIds = [...groupMap.keys()].filter(
    (id): id is string => id != null,
  );

  const assignedGroups: PtTrainerGroup[] = assignedTrainerIds
    .map((trainerId) => ({
      trainerId,
      trainerName: trainerNameById.get(trainerId) ?? "Unknown trainer",
      members: (groupMap.get(trainerId) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    }))
    .sort((a, b) => a.trainerName.localeCompare(b.trainerName));

  const unassigned = groupMap.get(null) ?? [];
  const groups: PtTrainerGroup[] = [...assignedGroups];
  if (unassigned.length > 0) {
    groups.push({
      trainerId: null,
      trainerName: "Unassigned",
      members: unassigned.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  return {
    totalPtMembers: rows.length,
    trainersEngaged: assignedTrainerIds.length,
    groups,
    staffOptions,
  };
}
