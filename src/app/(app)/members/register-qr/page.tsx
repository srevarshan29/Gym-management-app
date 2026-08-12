import { Suspense } from "react";

import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getRegisterQrPageData, getRegistrationUrl } from "@/lib/registration";
import { PageHeader } from "@/components/page-header";
import { RegisterQrPageSkeleton } from "@/components/page-loading-skeletons";
import { RegistrationQrPanel } from "@/components/registration-qr-panel";
import { QrRegistrationsList } from "@/components/qr-registrations-list";

function parseView(raw?: string): "pending" | "converted" | "all" {
  if (raw === "converted" || raw === "all") return raw;
  return "pending";
}

export default async function RegisterQrPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);
  const view = parseView(searchParams?.view);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Register (QR)"
        description="Self-service member registration via QR code."
      />

      <Suspense
        key={view}
        fallback={<RegisterQrPageSkeleton />}
      >
        <RegisterQrPageContent
          gymId={user.gymId}
          canManage={canManage}
          view={view}
        />
      </Suspense>
    </div>
  );
}

async function RegisterQrPageContent({
  gymId,
  canManage,
  view,
}: {
  gymId: string;
  canManage: boolean;
  view: "pending" | "converted" | "all";
}) {
  const { registrationToken, registrations } = await getRegisterQrPageData(
    gymId,
    view,
  );

  const registrationUrl = getRegistrationUrl(registrationToken);

  const rows = registrations.map((registration) => ({
    id: registration.id,
    name: registration.name,
    phone: registration.phone,
    email: registration.email,
    gender: registration.gender,
    status: registration.status,
    createdAt: registration.createdAt.toISOString(),
  }));

  return (
    <>
      <RegistrationQrPanel registrationUrl={registrationUrl} />

      <div>
        <h2 className="mb-4 font-display text-lg font-semibold">
          Pending registrations
        </h2>
        <QrRegistrationsList
          registrations={rows}
          canManage={canManage}
          view={view}
        />
      </div>
    </>
  );
}
