import { requireGym } from "@/lib/session";
import { ComingSoonState } from "@/components/coming-soon-state";

export default async function RegisterQrPage() {
  await requireGym();

  return (
    <ComingSoonState
      title="Register (QR)"
      description="Self-service member registration via QR code."
    />
  );
}
