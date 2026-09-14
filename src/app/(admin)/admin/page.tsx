import { getRepositories, platformContext } from "@/lib/firestore";
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
import { Building2 } from "lucide-react";

export default async function AdminPage() {
  const { gyms, users, members } = getRepositories();
  const gymDocs = await gyms.listAllForAdmin(platformContext);

  const rows = await Promise.all(
    gymDocs.map(async (g) => {
      const [owner, staffCount, memberCount] = await Promise.all([
        users.findOwnerByGym(platformContext, g.id),
        users.countByGym(platformContext, g.id),
        members.countByGym(platformContext, g.id),
      ]);

      return {
        id: g.id,
        name: g.name,
        createdAt: g.createdAt.toDate(),
        ownerName: owner?.name ?? null,
        ownerEmail: owner?.email ?? null,
        memberCount,
        staffCount,
      };
    }),
  );

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
