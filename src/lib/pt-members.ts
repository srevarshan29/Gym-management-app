import type { MemberGender } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import { getGymStaffOptions } from "@/lib/staff";

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

export type PtMembersPageData = {
  totalPtMembers: number;
  trainersEngaged: number;
  groups: PtTrainerGroup[];
  staffOptions: { id: string; name: string }[];
};

function toPtMemberRow(member: {
  id: string;
  memberNumber: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  trainerId: string | null;
  trainer: { name: string } | null;
  subscriptions: {
    endDate: Date;
    package: { name: string };
  }[];
}): PtMemberRow {
  const current =
    member.subscriptions.length > 0
      ? [...member.subscriptions].sort(
          (a, b) => b.endDate.getTime() - a.endDate.getTime(),
        )[0]
      : undefined;

  return {
    id: member.id,
    memberNumber: member.memberNumber,
    name: member.name,
    phone: member.phone,
    photoUrl: member.photoUrl,
    gender: member.gender,
    packageName: current?.package.name ?? null,
    trainerId: member.trainerId,
    trainerName: member.trainer?.name ?? null,
  };
}

export async function getPtMembersPageData(
  tenantGymId: string,
): Promise<PtMembersPageData> {
  const [ptMembers, staffOptions] = await Promise.all([
    withTenant(tenantGymId, (tx) =>
      tx.member.findMany({
        where: { gymId: tenantGymId, isPt: true },
        orderBy: { name: "asc" },
        include: {
          trainer: { select: { id: true, name: true } },
          subscriptions: {
            orderBy: { endDate: "desc" },
            take: 1,
            include: { package: { select: { name: true } } },
          },
        },
      }),
    ),
    getGymStaffOptions(tenantGymId),
  ]);

  const rows = ptMembers.map(toPtMemberRow);

  const groupMap = new Map<string | null, PtMemberRow[]>();
  for (const row of rows) {
    const key = row.trainerId;
    const list = groupMap.get(key) ?? [];
    list.push(row);
    groupMap.set(key, list);
  }

  const trainerIds = [...groupMap.keys()].filter(
    (id): id is string => id != null,
  );
  const trainerNameById = new Map(
    ptMembers
      .filter((m) => m.trainer)
      .map((m) => [m.trainerId!, m.trainer!.name]),
  );

  const assignedGroups: PtTrainerGroup[] = trainerIds
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
    trainersEngaged: trainerIds.length,
    groups,
    staffOptions,
  };
}
