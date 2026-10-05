import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { MemberPortalQrPanel } from "@/components/member-portal/member-portal-qr-panel";
import { PageHeader } from "@/components/page-header";
import { getMemberPortalQrPageData } from "@/lib/member-portal/portal-qr-page";
import { canManageMembers } from "@/lib/permissions";
import { requireGym } from "@/lib/session";

export default async function MemberPortalSettingsPage() {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    redirect("/settings");
  }

  const { portalLoginUrl } = await getMemberPortalQrPageData(user.gymId);

  return (
    <div>
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Settings
      </Link>

      <PageHeader
        title="Member Portal QR"
        description="Share one permanent QR code so members can sign in to the portal."
      />

      {!portalLoginUrl ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Member portal entry is not configured for this gym yet. Contact support if
          this persists.
        </p>
      ) : (
        <MemberPortalQrPanel portalLoginUrl={portalLoginUrl} />
      )}
    </div>
  );
}
