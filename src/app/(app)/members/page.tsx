import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { requireGym } from "@/lib/session";
import {
  getMembersDirectoryPage,
  MEMBERS_DIRECTORY_PAGE_SIZE,
} from "@/lib/members-directory-queries";
import { PageHeader } from "@/components/page-header";
import { MembersList } from "@/components/members-list";
import { MembersPageSkeleton } from "@/components/page-loading-skeletons";
import { Button } from "@/components/ui/button";

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string };
}) {
  const user = await requireGym();
  const page = Number(searchParams?.page ?? "1");
  const q = searchParams?.q ?? "";

  return (
    <Suspense fallback={<MembersPageSkeleton />}>
      <MembersPageContent gymId={user.gymId} page={page} q={q} />
    </Suspense>
  );
}

async function MembersPageContent({
  gymId,
  page,
  q,
}: {
  gymId: string;
  page: number;
  q: string;
}) {
  const result = await getMembersDirectoryPage(gymId, {
    page,
    pageSize: MEMBERS_DIRECTORY_PAGE_SIZE,
    q,
  });

  const items = result.rows.map((m) => ({
    id: m.id,
    memberNumber: m.memberNumber,
    name: m.name,
    phone: m.phone,
    photoUrl: m.photoUrl,
    gender: m.gender,
    packageName: m.packageName,
    addedByName: m.addedByName,
    status: m.status,
    isPt: m.isPt,
    pendingAmount: m.pendingAmount,
    endDate: m.endDate?.toISOString() ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Members"
        description={`${result.totalMembers} member${result.totalMembers === 1 ? "" : "s"} total.`}
      >
        <Button asChild className="w-full gap-1 sm:w-auto">
          <Link href="/members/new">
            <Plus className="h-4 w-4" /> Add member
          </Link>
        </Button>
      </PageHeader>

      <MembersList
        members={items}
        query={q}
        page={result.page}
        pageSize={result.pageSize}
        matchingCount={result.matchingCount}
        totalMembers={result.totalMembers}
        searchAction="/members"
      />
    </div>
  );
}
