import { MemberDashboardAttendanceSection } from "@/components/member-portal/dashboard/member-dashboard-attendance";
import { MemberDashboardMetricCards } from "@/components/member-portal/dashboard/member-dashboard-metric-cards";
import { LockedLink } from "@/components/navigation/locked-link";
import { MembershipProgressRing } from "@/components/member-portal/membership-progress-ring";
import { TodaysWorkoutStartButton } from "@/components/member-portal/todays-workout-start-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { memberFirstName } from "@/lib/member-portal/dashboard-message-engine";
import type { MemberPortalDashboardData } from "@/lib/member-portal/load-member-portal-dashboard";
import type { MemberPortalOverview } from "@/lib/member-portal/queries";
import type { SuggestedWorkoutDay } from "@/lib/workout-tracking/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CARD_CLASS =
  "rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm";

function TodaysWorkoutCard({
  suggestion,
}: {
  suggestion: SuggestedWorkoutDay;
}) {
  const emptyCopy = "No workout assigned today — check with your trainer";

  if (suggestion.kind === "completed_today") {
    return (
      <Card className={CARD_CLASS}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1 pt-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold leading-tight">
              {suggestion.completedLabel}
            </CardTitle>
            <CardDescription className="text-xs text-primary">
              Done ✓
            </CardDescription>
          </div>
          <LockedLink
            href="/member/workout"
            className="shrink-0 text-xs text-muted-foreground hover:text-primary"
          >
            All days
          </LockedLink>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          {suggestion.next ? (
            <p className="text-sm text-muted-foreground">
              Next: {suggestion.next.label}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (suggestion.kind === "none" || suggestion.kind === "legacy") {
    return (
      <Card className={CARD_CLASS}>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-sm font-semibold">Today&apos;s workout</CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <p className="text-xs text-muted-foreground">{emptyCopy}</p>
        </CardContent>
      </Card>
    );
  }

  const title =
    suggestion.kind === "resume"
      ? suggestion.label
        ? `${suggestion.label}`
        : "Workout in progress"
      : suggestion.label;

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1 pt-3">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold leading-tight">
            {title}
          </CardTitle>
          <CardDescription className="text-xs">
            {suggestion.exerciseCount} exercise
            {suggestion.exerciseCount === 1 ? "" : "s"}
            {suggestion.estimatedMinutes != null
              ? ` · ${suggestion.estimatedMinutes} min`
              : ""}
          </CardDescription>
        </div>
        <LockedLink
          href="/member/workout"
          className="shrink-0 text-xs text-muted-foreground hover:text-primary"
        >
          All days
        </LockedLink>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <TodaysWorkoutStartButton
          dayId={suggestion.dayId}
          label={
            suggestion.kind === "resume" ? "Resume" : "Start"
          }
          className="h-11 w-full rounded-2xl text-base font-bold"
        />
      </CardContent>
    </Card>
  );
}

function CompactMembershipRow({
  overview,
}: {
  overview: MemberPortalOverview;
}) {
  const daysRemaining = overview.daysRemaining ?? 0;
  const planTotalDays = overview.planTotalDays ?? 1;
  const displayDays = Math.max(0, daysRemaining);
  const pendingAmount = overview.pendingAmount ?? 0;
  const statusLabel =
    overview.status === "ACTIVE"
      ? "Active"
      : overview.status === "EXPIRING_SOON"
        ? "Expiring soon"
        : overview.status;

  return (
    <Card className={CARD_CLASS}>
      <CardContent className="flex items-center gap-3 p-3">
        {planTotalDays > 0 ? (
          <MembershipProgressRing
            daysRemaining={daysRemaining}
            planTotalDays={planTotalDays}
            size={64}
            strokeWidth={6}
            className="shrink-0"
          />
        ) : (
          <p className="font-mono text-xl font-bold tabular-nums">{displayDays}</p>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Days left</p>
          <p className="text-sm font-semibold leading-tight">
            {statusLabel}
            {overview.endDate ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · ends {formatDate(overview.endDate)}
              </span>
            ) : null}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              pendingAmount > 0 ? "text-destructive" : "text-foreground",
            )}
          >
            {formatCurrency(pendingAmount)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MemberPortalOverviewPanel({
  overview,
  suggestion,
  dashboard,
}: {
  overview: MemberPortalOverview;
  suggestion: SuggestedWorkoutDay;
  dashboard: MemberPortalDashboardData;
}) {
  const hasSubscription = overview.packageName != null;
  const [year, monthIndex0] = dashboard.dateKey.split("-").map(Number);
  const calendarMonthIndex0 = monthIndex0 - 1;
  const greetingName = memberFirstName(overview.memberName);

  if (!hasSubscription) {
    return (
      <div className="space-y-3">
        <div>
          <h1 className="font-display text-xl font-bold leading-tight">
            Hi, {greetingName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{dashboard.message.text}</p>
        </div>
        <Card className={CARD_CLASS}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              No active subscription on file. Contact your gym front desk.
            </p>
          </CardContent>
        </Card>
        <MemberDashboardMetricCards
          logDate={dashboard.dateKey}
          calories={dashboard.calories}
          calorieTarget={dashboard.calorieTarget}
          caloriePercent={dashboard.caloriePercent}
          calorieGoalComplete={dashboard.calorieGoalComplete}
          waterConsumedMl={dashboard.waterConsumedMl}
          waterTargetMl={dashboard.waterTargetMl}
          waterPercent={dashboard.waterPercent}
          waterGoalComplete={dashboard.waterGoalComplete}
        />
        <TodaysWorkoutCard suggestion={suggestion} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-xl font-bold leading-tight">
          Hi, {greetingName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{dashboard.message.text}</p>
      </div>

      <TodaysWorkoutCard suggestion={suggestion} />

      <MemberDashboardMetricCards
        logDate={dashboard.dateKey}
        calories={dashboard.calories}
        calorieTarget={dashboard.calorieTarget}
        caloriePercent={dashboard.caloriePercent}
        calorieGoalComplete={dashboard.calorieGoalComplete}
        waterConsumedMl={dashboard.waterConsumedMl}
        waterTargetMl={dashboard.waterTargetMl}
        waterPercent={dashboard.waterPercent}
        waterGoalComplete={dashboard.waterGoalComplete}
      />

      <CompactMembershipRow overview={overview} />

      <MemberDashboardAttendanceSection
        weekDays={dashboard.weekDays}
        visitsThisWeek={dashboard.visitsThisWeek}
        initialYear={year}
        initialMonthIndex0={calendarMonthIndex0}
      />
    </div>
  );
}
