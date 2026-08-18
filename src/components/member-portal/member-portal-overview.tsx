import { Dumbbell, Salad, TrendingUp } from "lucide-react";

import { LockedLink } from "@/components/navigation/locked-link";
import { MembershipProgressRing } from "@/components/member-portal/membership-progress-ring";
import { MemberPortalStatCard } from "@/components/member-portal/member-portal-stat-card";
import { TodaysWorkoutStartButton } from "@/components/member-portal/todays-workout-start-button";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MemberPortalOverview } from "@/lib/member-portal/queries";
import type { SuggestedWorkoutDay } from "@/lib/workout-tracking/suggested-day";
import { formatCurrency, formatDate } from "@/lib/utils";

const CARD_CLASS =
  "rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm";

const QUICK_ACTIONS = [
  { href: "/member/workout", label: "Workouts", icon: Dumbbell },
  { href: "/member/workout/progress", label: "Progress", icon: TrendingUp },
  { href: "/member/diet", label: "Diet", icon: Salad },
] as const;

function TodaysWorkoutCard({ suggestion }: { suggestion: SuggestedWorkoutDay }) {
  const emptyCopy = "No workout assigned today — check with your trainer";

  if (suggestion.kind === "none" || suggestion.kind === "legacy") {
    return (
      <Card className={CARD_CLASS}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Today&apos;s workout</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyCopy}</p>
        </CardContent>
      </Card>
    );
  }

  if (suggestion.kind === "resume") {
    return (
      <Card className={CARD_CLASS}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Today&apos;s workout</CardTitle>
          <CardDescription>
            {suggestion.label ? `${suggestion.label} in progress` : "Workout in progress"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {suggestion.exerciseCount} exercise
            {suggestion.exerciseCount === 1 ? "" : "s"}
            {suggestion.estimatedMinutes != null
              ? ` · ~${suggestion.estimatedMinutes} min`
              : ""}
          </p>
          <TodaysWorkoutStartButton
            dayId={suggestion.dayId}
            label="Resume workout"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Today&apos;s workout</CardTitle>
        <CardDescription>{suggestion.label}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {suggestion.exerciseCount} exercise
          {suggestion.exerciseCount === 1 ? "" : "s"}
          {` · ~${suggestion.estimatedMinutes} min`}
        </p>
        <TodaysWorkoutStartButton dayId={suggestion.dayId} label="Start workout" />
        <LockedLink
          href="/member/workout"
          className="block text-center text-sm text-primary hover:underline"
        >
          See all days
        </LockedLink>
      </CardContent>
    </Card>
  );
}

function QuickActionsGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {QUICK_ACTIONS.map((action) => (
        <LockedLink key={action.href} href={action.href} className="min-w-0">
          <Card className={CARD_CLASS}>
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">{action.label}</span>
            </CardContent>
          </Card>
        </LockedLink>
      ))}
    </div>
  );
}

export function MemberPortalOverviewPanel({
  overview,
  suggestion,
}: {
  overview: MemberPortalOverview;
  suggestion: SuggestedWorkoutDay;
}) {
  const hasSubscription = overview.packageName != null;

  if (!hasSubscription) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-xl font-bold">
          Hi, {overview.memberName}
        </h1>
        <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              No active subscription on file. Contact your gym front desk.
            </p>
          </CardContent>
        </Card>
        <TodaysWorkoutCard suggestion={suggestion} />
        <QuickActionsGrid />
      </div>
    );
  }

  const daysRemaining = overview.daysRemaining ?? 0;
  const planTotalDays = overview.planTotalDays ?? 1;
  const displayDays = Math.max(0, daysRemaining);
  const percentRemaining = Math.min(
    100,
    Math.max(0, Math.round((displayDays / Math.max(1, planTotalDays)) * 100)),
  );
  const paidAmount = overview.paidAmount ?? 0;
  const pendingAmount = overview.pendingAmount ?? 0;
  const fullyPaid = pendingAmount <= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-xl font-bold">
          Hi, {overview.memberName}
        </h1>
        <StatusBadge status={overview.status} className="shrink-0" />
      </div>

      <Card className={CARD_CLASS}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {overview.packageName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 pb-6 pt-0">
          {planTotalDays > 0 ? (
            <MembershipProgressRing
              daysRemaining={daysRemaining}
              planTotalDays={planTotalDays}
            />
          ) : (
            <p className="font-mono text-2xl font-bold">
              {displayDays} days left
            </p>
          )}
          <p className="text-center text-sm text-muted-foreground">
            {percentRemaining}% of plan remaining
            {overview.endDate ? (
              <>
                {" "}
                · ends {formatDate(overview.endDate)}
              </>
            ) : null}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MemberPortalStatCard
          label="Paid"
          value={formatCurrency(paidAmount)}
          valueClassName={fullyPaid ? "text-primary" : "text-foreground"}
        />
        <MemberPortalStatCard
          label="Pending"
          value={formatCurrency(pendingAmount)}
          valueClassName={
            pendingAmount > 0 ? "text-destructive" : "text-foreground"
          }
        />
      </div>

      <TodaysWorkoutCard suggestion={suggestion} />
      <QuickActionsGrid />
    </div>
  );
}
