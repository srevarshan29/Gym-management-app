import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireGym } from "@/lib/session";
import { canLogPayments } from "@/lib/permissions";
import { getRepositories, platformContext } from "@/lib/firestore";
import { getGymStaffOptions } from "@/lib/staff";
import { getVisitorPrefill } from "@/lib/visitors";
import { PageHeader } from "@/components/page-header";
import { MemberForm, type PackageOption } from "@/components/member-form";
import { Button } from "@/components/ui/button";
import { getMembershipPolicyForGym } from "@/lib/gym-profile";
import { durationLabel } from "@/lib/subscription";
import type { MemberGender } from "@/lib/firestore/types";

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

function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value == null) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams?: {
    name?: string | string[];
    phone?: string | string[];
    email?: string | string[];
    gender?: string | string[];
    visitorId?: string | string[];
  };
}) {
  const user = await requireGym();
  const tenantGymId = user.gymId;
  const visitorId = firstSearchParam(searchParams?.visitorId);

  const { packages: packagesRepo } = getRepositories();

  const [packages, staffOptions, membershipPolicyText] = await Promise.all([
    packagesRepo.listActive(platformContext, tenantGymId),
    getGymStaffOptions(tenantGymId),
    getMembershipPolicyForGym(tenantGymId),
  ]);

  let visitor = null;

  if (visitorId) {
    visitor = await getVisitorPrefill(tenantGymId, visitorId);
  }

  const options: PackageOption[] = packages.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
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
        initialName={visitor?.name ?? firstSearchParam(searchParams?.name)}
        initialPhone={visitor?.phone ?? firstSearchParam(searchParams?.phone)}
        initialEmail={visitor?.email ?? firstSearchParam(searchParams?.email)}
        initialGender={
          visitor?.gender ?? parseGender(firstSearchParam(searchParams?.gender))
        }
        initialFitnessGoal={visitor?.fitnessGoal ?? undefined}
        initialAgeYears={visitor?.ageYears ?? undefined}
        initialHeightCm={visitor?.heightCm ?? undefined}
        initialWeightKg={visitor?.weightKg ?? undefined}
        visitorId={visitorId}
        membershipPolicyText={membershipPolicyText}
      />
    </div>
  );
}
