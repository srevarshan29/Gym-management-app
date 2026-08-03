import { Suspense } from "react";
import { Plus } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getVisitors, type VisitorStatusFilter } from "@/lib/visitors";
import { PageHeader } from "@/components/page-header";
import { VisitorsPageSkeleton } from "@/components/page-loading-skeletons";
import { VisitorDialog } from "@/components/visitor-dialog";
import { VisitorsList } from "@/components/visitors-list";
import { Button } from "@/components/ui/button";

function parseView(raw?: string): VisitorStatusFilter {
  if (raw === "converted" || raw === "all") return raw;
  return "pending";
}

export default async function VisitorsPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);
  const view = parseView(searchParams?.view);

  return (
    <div>
      <PageHeader
        title="Visitors"
        description="Walk-ins and trial visits — separate from full members."
      >
        {canManage ? (
          <VisitorDialog
            trigger={
              <Button className="gap-1">
                <Plus className="h-4 w-4" /> Log visitor
              </Button>
            }
          />
        ) : null}
      </PageHeader>

      <Suspense
        key={view}
        fallback={<VisitorsPageSkeleton />}
      >
        <VisitorsPageContent gymId={user.gymId} canManage={canManage} view={view} />
      </Suspense>
    </div>
  );
}

async function VisitorsPageContent({
  gymId,
  canManage,
  view,
}: {
  gymId: string;
  canManage: boolean;
  view: VisitorStatusFilter;
}) {
  const visitors = await getVisitors(gymId, view);

  const rows = visitors.map((visitor) => ({
    id: visitor.id,
    name: visitor.name,
    phone: visitor.phone,
    visitDate: visitor.visitDate.toISOString(),
    notes: visitor.notes,
    status: visitor.status,
  }));

  return <VisitorsList visitors={rows} canManage={canManage} view={view} />;
}
