import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canLogPayments } from "@/lib/permissions";
import { withTenant } from "@/lib/db-context";
import { getGymStaffOptions } from "@/lib/staff";
import { PageHeader } from "@/components/page-header";
import { MemberForm, type PackageOption } from "@/components/member-form";
import { Button } from "@/components/ui/button";
import { getMembershipPolicyForGym } from "@/lib/gym-profile";
import { durationLabel } from "@/lib/subscription";
import type { MemberGender } from "@prisma/client";

const GENDER_VALUES: MemberGender[] = [
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
];

function parseGender(raw?: string): MemberGender | undefined {
  if (!raw) return undefined;
  return GENDER_VALUES.includes(raw as MemberGender)
    ? (raw as MemberGender)
    : undefined;
}

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams?: {
    name?: string;
    phone?: string;
    email?: string;
    gender?: string;
    visitorId?: string;
  };
}) {
  const user = await requireGym();
  const visitorId = searchParams?.visitorId?.trim();

  const [packages, staffOptions, membershipPolicyText, visitor] =
    await Promise.all([
      withTenant(user.gymId, (tx) =>
        tx.package.findMany({
          where: { gymId: user.gymId, isActive: true },
          orderBy: { name: "asc" },
        }),
      ),
      getGymStaffOptions(user.gymId),
      getMembershipPolicyForGym(user.gymId),
      visitorId
        ? withTenant(user.gymId, (tx) =>
            tx.visitor.findFirst({
              where: { id: visitorId, gymId: user.gymId, status: "pending" },
              select: {
                name: true,
                phone: true,
                email: true,
                gender: true,
                fitnessGoal: true,
                ageYears: true,
                heightCm: true,
                weightKg: true,
              },
            }),
          )
        : Promise.resolve(null),
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
        initialName={visitor?.name ?? searchParams?.name}
        initialPhone={visitor?.phone ?? searchParams?.phone}
        initialEmail={visitor?.email ?? searchParams?.email}
        initialGender={visitor?.gender ?? parseGender(searchParams?.gender)}
        initialFitnessGoal={visitor?.fitnessGoal ?? undefined}
        initialAgeYears={visitor?.ageYears ?? undefined}
        initialHeightCm={visitor?.heightCm ?? undefined}
        initialWeightKg={
          visitor?.weightKg != null ? Number(visitor.weightKg) : undefined
        }
        visitorId={visitorId}
        membershipPolicyText={membershipPolicyText}
      />
    </div>
  );
}
