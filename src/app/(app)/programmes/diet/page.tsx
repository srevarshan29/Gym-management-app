import { requireGym } from "@/lib/session";
import { ComingSoonState } from "@/components/coming-soon-state";

export default async function DietPlansPage() {
  await requireGym();

  return (
    <ComingSoonState
      title="Diet Plans"
      description="Nutrition programmes assigned to members."
    />
  );
}
