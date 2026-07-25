import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireGym } from "@/lib/session";
import { withTenant } from "@/lib/db-context";
import { getGymStaffOptions } from "@/lib/staff";
import { PageHeader } from "@/components/page-header";
import { MemberForm } from "@/components/member-form";
import { Button } from "@/components/ui/button";

export default async function EditMemberPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireGym();

  const [member, staffOptions] = await Promise.all([
    withTenant(user.gymId, (tx) =>
      tx.member.findFirst({
        where: { id: params.id, gymId: user.gymId },
      }),
    ),
    getGymStaffOptions(user.gymId),
  ]);
  if (!member) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/members/${member.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to profile
          </Link>
        </Button>
      </div>
      <PageHeader title="Edit member" description={member.name} />
      <MemberForm
        mode="edit"
        member={{
          id: member.id,
          name: member.name,
          phone: member.phone,
          email: member.email,
          photoUrl: member.photoUrl,
          gender: member.gender,
          notes: member.notes,
          isPt: member.isPt,
          trainerId: member.trainerId,
        }}
        staffOptions={staffOptions}
      />
    </div>
  );
}
