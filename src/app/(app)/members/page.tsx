import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";

import { requireGym } from "@/lib/session";
import { getMembersWithStatus } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { MembersList } from "@/components/members-list";
import { MembersPageSkeleton } from "@/components/page-loading-skeletons";
import { Button } from "@/components/ui/button";

export default async function MembersPage() {
  const user = await requireGym();

  return (
    <Suspense fallback={<MembersPageSkeleton />}>
      <MembersPageContent gymId={user.gymId} />
    </Suspense>
  );
}

async function MembersPageContent({ gymId }: { gymId: string }) {
  const members = await getMembersWithStatus(gymId);

  const items = members.map((m) => ({
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
        description={`${members.length} member${members.length === 1 ? "" : "s"} total.`}
      >
        <Button asChild className="gap-1">
          <Link href="/members/new">
            <Plus className="h-4 w-4" /> Add member
          </Link>
        </Button>
      </PageHeader>

      <MembersList members={items} />
    </div>
  );
}
