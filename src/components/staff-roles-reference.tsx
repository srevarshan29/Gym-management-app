import { ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function RoleCard({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-2 font-display font-semibold">{title}</p>
      <ul className="space-y-1 text-muted-foreground">
        {points.map((p) => (
          <li key={p}>• {p}</li>
        ))}
      </ul>
    </div>
  );
}

export function StaffRolesReference() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          Roles &amp; permissions
        </CardTitle>
        <CardDescription>
          Owners see gym-wide revenue reports. Admins and staff can view subs,
          paid, and pending amounts per member and log payments without accessing
          payment history totals.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
        <RoleCard
          title="Owner"
          points={[
            "Everything below",
            "View payments & revenue reports",
            "Delete members",
            "Manage staff accounts",
            "Manage employees",
            "Manage events",
            "Download reports (CSV)",
            "Export payment history (CSV)",
          ]}
        />
        <RoleCard
          title="Admin"
          points={[
            "Add & edit members",
            "Renew subscriptions",
            "View subs, paid & pending per member",
            "Log payments for members",
            "Create & edit packages",
            "Manage employees",
            "Manage events",
            "Download reports (CSV)",
          ]}
        />
        <RoleCard
          title="Staff"
          points={[
            "Add & edit members",
            "Renew subscriptions",
            "View subs, paid & pending per member",
            "Log payments for members",
            "Manage events",
          ]}
        />
      </CardContent>
    </Card>
  );
}
