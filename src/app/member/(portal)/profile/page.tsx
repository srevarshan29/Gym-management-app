import { notFound } from "next/navigation";

import { requireMember } from "@/lib/member-session";
import { getMemberPortalRow } from "@/lib/member-portal/access";
import { MemberPortalProfileForm } from "@/components/member-portal/member-portal-profile-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MemberProfilePage() {
  const session = await requireMember();
  const row = await getMemberPortalRow(session.gymId, session.memberId);
  if (!row) notFound();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberPortalProfileForm
            profile={{
              name: row.name,
              phone: row.phone,
              photoUrl: row.photoUrl,
              gender: row.gender,
              ageYears: row.ageYears,
              heightCm: row.heightCm,
              weightKg: row.weightKg != null ? Number(row.weightKg) : null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
