import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getRegisterQrPageData, getRegistrationUrl } from "@/lib/registration";
import { PageHeader } from "@/components/page-header";
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

  const { registrationToken, registrations } = await getRegisterQrPageData(
    user.gymId,
    view,
  );

  const registrationUrl = getRegistrationUrl(registrationToken);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Register (QR)"
        description="Self-service member registration via QR code."
      />

      <RegistrationQrPanel registrationUrl={registrationUrl} />

      <div>
        <h2 className="mb-4 font-display text-lg font-semibold">
          Pending registrations
        </h2>
        <QrRegistrationsList
          registrations={registrations}
          canManage={canManage}
          view={view}
        />
      </div>
    </div>
  );
}
