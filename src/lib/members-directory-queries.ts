import { getRepositories, platformContext } from "@/lib/firestore";
import type { MemberListItem } from "@/lib/queries";

export const MEMBERS_DIRECTORY_PAGE_SIZE = 50;

export type MembersDirectoryPageResult = {
  rows: MemberListItem[];
  totalMembers: number;
  matchingCount: number;
  page: number;
  pageSize: number;
};

export async function getMembersDirectoryPage(
  tenantGymId: string,
  options: { page?: number; pageSize?: number; q?: string } = {},
): Promise<MembersDirectoryPageResult> {
  const { members } = getRepositories();
  return members.listDirectoryPage(platformContext, tenantGymId, options);
}
