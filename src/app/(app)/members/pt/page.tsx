import { Suspense } from "react";
import { Dumbbell, Users } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getPtMembersPageData } from "@/lib/pt-members";
import { PageHeader } from "@/components/page-header";
import { PtMembersPageSkeleton } from "@/components/page-loading-skeletons";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { PtMembersPanel } from "@/components/pt-members-panel";

export default async function PtMembersPage() {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);

  return (
    <Suspense fallback={<PtMembersPageSkeleton />}>
      <PtMembersPageContent gymId={user.gymId} canManage={canManage} />
    </Suspense>
  );
}

async function PtMembersPageContent({
  gymId,
  canManage,
}: {
  gymId: string;
  canManage: boolean;
}) {
  const data = await getPtMembersPageData(gymId);

  return (
    <div>
      <PageHeader
        title="PT Members"
        description="Personal training clients grouped by assigned trainer."
      />

      <section
        aria-label="PT summary"
        className="mb-8 grid gap-3 sm:grid-cols-2"
      >
        <DashboardStatCard
          title="Total PT members"
          value={String(data.totalPtMembers)}
          hint="Marked as personal training"
          icon={<Users className="h-5 w-5" />}
          tone="primary"
        />
        <DashboardStatCard
          title="Trainers engaged"
          value={String(data.trainersEngaged)}
          hint="Assigned to at least one PT member"
          icon={<Dumbbell className="h-5 w-5" />}
          tone="green"
        />
      </section>

      <PtMembersPanel
        groups={data.groups}
        staffOptions={data.staffOptions}
        canManage={canManage}
      />
    </div>
  );
}
