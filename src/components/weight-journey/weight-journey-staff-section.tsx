import { MemberWeightJourneyPanel } from "@/components/member-portal/weight-journey/member-weight-journey-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WeightJourneySnapshot } from "@/lib/weight-journey/load-snapshot";

export function WeightJourneyStaffSection({
  snapshot,
}: {
  snapshot: WeightJourneySnapshot;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Weight Journey</CardTitle>
        <CardDescription>
          Read-only view of the member&apos;s climb. Staff cannot edit
          measurements or targets here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MemberWeightJourneyPanel snapshot={snapshot} readOnly />
      </CardContent>
    </Card>
  );
}
