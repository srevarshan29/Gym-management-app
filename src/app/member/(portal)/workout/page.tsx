import { requireMember } from "@/lib/member-session";
import { getMemberPortalWorkoutPlan } from "@/lib/member-portal/queries";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MemberWorkoutPage() {
  const session = await requireMember();
  const plan = await getMemberPortalWorkoutPlan(
    session.gymId,
    session.memberId,
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Workout plan</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {plan?.title ?? "No workout plan assigned"}
          </CardTitle>
          {plan ? (
            <CardDescription>
              Level: {plan.level} · Updated {formatDate(plan.updatedAt)}
            </CardDescription>
          ) : (
            <CardDescription>
              Your trainer can assign a workout plan from the staff app.
            </CardDescription>
          )}
        </CardHeader>
        {plan ? (
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm">
              {plan.weeklySchedule}
            </pre>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
