import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getWorkoutPlansPageData } from "@/lib/workout-plans";
import { PageHeader } from "@/components/page-header";
import { ProgrammePlansPageSkeleton } from "@/components/page-loading-skeletons";
import { WorkoutPlansList } from "@/components/workout-plans-list";
import { Button } from "@/components/ui/button";

export default async function WorkoutPlansPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);
  const page = Number(searchParams?.page ?? "1");

  return (
    <div className="space-y-6">
      <Suspense key={page} fallback={<WorkoutPlansPageShell />}>
        <WorkoutPlansPageContent gymId={user.gymId} canManage={canManage} page={page} />
      </Suspense>
    </div>
  );
}

function WorkoutPlansPageShell() {
  return (
    <>
      <PageHeader
        title="Workout Plans"
        description="Structured training programmes assigned to members."
      />
      <ProgrammePlansPageSkeleton />
    </>
  );
}

async function WorkoutPlansPageContent({
  gymId,
  canManage,
  page,
}: {
  gymId: string;
  canManage: boolean;
  page: number;
}) {
  const { plans, members, assignedMemberIds, total, pageSize } =
    await getWorkoutPlansPageData(gymId, page);

  const assignedSet = new Set(assignedMemberIds);
  const eligibleMembers = members.filter(
    (member) => !assignedSet.has(member.id),
  );

  return (
    <>
      <PageHeader
        title="Workout Plans"
        description="Structured training programmes assigned to members."
      >
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/programmes/exercises">Exercise library</Link>
            </Button>
            {eligibleMembers.length > 0 ? (
              <Button asChild className="gap-1">
                <Link href="/programmes/workout/new">
                  <Plus className="h-4 w-4" /> Add plan
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </PageHeader>

      <WorkoutPlansList
        plans={plans}
        canManage={canManage}
        page={page}
        pageSize={pageSize}
        total={total}
      />
    </>
  );
}
