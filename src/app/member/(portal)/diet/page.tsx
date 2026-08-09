import { requireMember } from "@/lib/member-session";
import { getMemberPortalDietPlan } from "@/lib/member-portal/queries";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function MemberDietPage() {
  const session = await requireMember();
  const plan = await getMemberPortalDietPlan(session.gymId, session.memberId);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Diet plan</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {plan?.title ?? "No diet plan assigned"}
          </CardTitle>
          {plan ? (
            <CardDescription>
              {plan.caloriesPerDay} kcal/day · Updated {formatDate(plan.updatedAt)}
            </CardDescription>
          ) : (
            <CardDescription>
              Your trainer or gym admin can assign a plan from the staff app.
            </CardDescription>
          )}
        </CardHeader>
        {plan ? (
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm">
              {plan.mealPlan}
            </pre>
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
