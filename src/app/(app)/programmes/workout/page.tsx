import { requireGym } from "@/lib/session";
import { ComingSoonState } from "@/components/coming-soon-state";

export default async function WorkoutPlansPage() {
  await requireGym();

  return (
    <ComingSoonState
      title="Workout Plans"
      description="Training programmes and exercise templates."
    />
  );
}
