import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canLogPayments } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import { getGymStaffOptions } from "@/lib/staff";
import { durationLabel } from "@/lib/subscription";
import { PageHeader } from "@/components/page-header";
import { MemberForm, type PackageOption } from "@/components/member-form";
import { Button } from "@/components/ui/button";

export default async function NewMemberPage() {
  const user = await requireGym();

  const [packages, staffOptions] = await Promise.all([
    withTenant(user.gymId, (tx) =>
      tx.package.findMany({
        where: { gymId: user.gymId, isActive: true },
        orderBy: { name: "asc" },
      }),
    ),
    getGymStaffOptions(user.gymId),
  ]);

  const options: PackageOption[] = packages.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    durationLabel: durationLabel(p.durationValue, p.durationUnit),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/members">
            <ArrowLeft className="h-4 w-4" /> Back to members
          </Link>
        </Button>
      </div>
      <PageHeader title="Add member" description="Create a new gym member." />
      <MemberForm
        mode="create"
        packages={options}
        canRecordPayment={canLogPayments(user.role)}
        staffOptions={staffOptions}
      />
    </div>
  );
}
