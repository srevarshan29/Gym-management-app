import { Building2 } from "lucide-react";

import { withSuperAdmin } from "@/lib/db-context";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { GymManager } from "@/components/gym-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminPage() {
  const gyms = await withSuperAdmin((tx) =>
    tx.gym.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          where: { role: "OWNER" },
          select: { name: true, email: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
        _count: { select: { members: true, users: true } },
      },
    }),
  );

  const rows = gyms.map((g) => ({
    id: g.id,
    name: g.name,
    createdAt: g.createdAt,
    ownerName: g.users[0]?.name ?? null,
    ownerEmail: g.users[0]?.email ?? null,
    memberCount: g._count.members,
    staffCount: g._count.users,
  }));

  return (
    <div>
      <PageHeader
        title="Gyms"
        description="Every tenant on the platform. Each gym's data is fully isolated from the others."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            All gyms
          </CardTitle>
          <CardDescription>
            {rows.length} gym{rows.length === 1 ? "" : "s"} provisioned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GymManager
            gyms={rows.map((r) => ({ ...r, createdAtLabel: formatDate(r.createdAt) }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
