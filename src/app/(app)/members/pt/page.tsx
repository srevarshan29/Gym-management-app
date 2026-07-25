import { Dumbbell, Users } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getPtMembersPageData } from "@/lib/pt-members";
import { PageHeader } from "@/components/page-header";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { PtMembersPanel } from "@/components/pt-members-panel";

export default async function PtMembersPage() {
  const user = await requireGym();
  const data = await getPtMembersPageData(user.gymId);
  const canManage = canManageMembers(user.role);

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
