"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  checkInByMemberNumberAction,
  loadMemberAttendanceHistoryAction,
  type CheckInActionData,
  type MemberAttendanceHistoryData,
} from "@/app/actions/attendance";
import { AttendanceResultBanner } from "@/components/attendance-result-banner";
import {
  AttendanceHistoryList,
  AttendanceTodayTable,
} from "@/components/attendance-today-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import type { AttendanceListItem } from "@/lib/attendance/types";
import { formatMemberNumber } from "@/lib/receipt-display";

type AttendancePageClientProps = {
  canManage: boolean;
  initialToday: AttendanceListItem[];
};

function CheckInSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Checking in…" : "Check In"}
    </Button>
  );
}

function CheckInForm({
  onSuccess,
}: {
  onSuccess: (data: CheckInActionData) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [memberNumber, setMemberNumber] = React.useState("");
  const guardedAction = useGuardedFormAction(checkInByMemberNumberAction);
  const [state, formAction] = useFormState<
    ActionResult<CheckInActionData> | undefined,
    FormData
  >(guardedAction, undefined);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!state?.ok || !state.data) return;
    if (state.data.status === "success") {
      onSuccess(state.data);
      setMemberNumber("");
      inputRef.current?.focus();
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="memberNumber">Enter Member Number</Label>
        <Input
          ref={inputRef}
          id="memberNumber"
          name="memberNumber"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 72"
          value={memberNumber}
          onChange={(e) => setMemberNumber(e.target.value)}
          className="text-lg"
        />
      </div>
      {state && !state.ok ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state?.ok && state.data ? (
        <>
          <AttendanceResultBanner result={state.data} />
          {state.data.recentHistory && state.data.recentHistory.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent visits</p>
              <AttendanceHistoryList rows={state.data.recentHistory} />
            </div>
          ) : null}
        </>
      ) : null}
      <CheckInSubmitButton />
    </form>
  );
}

function HistoryLookup() {
  const guardedAction = useGuardedFormAction(loadMemberAttendanceHistoryAction);
  const [state, formAction] = useFormState<
    ActionResult<MemberAttendanceHistoryData> | undefined,
    FormData
  >(guardedAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Member attendance history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={formAction}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="historyMemberNumber">Member number</Label>
            <Input
              id="historyMemberNumber"
              name="memberNumber"
              inputMode="numeric"
              placeholder="e.g. 72"
            />
          </div>
          <HistorySubmitButton />
        </form>
        {state && !state.ok ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        {state?.ok && state.data ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {state.data.memberName} · {formatMemberNumber(state.data.memberNumber)}
            </p>
            <AttendanceHistoryList rows={state.data.history} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function HistorySubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      View history
    </Button>
  );
}

export function AttendancePageClient({
  canManage,
  initialToday,
}: AttendancePageClientProps) {
  const [todayRows, setTodayRows] = React.useState(initialToday);

  const handleSuccess = React.useCallback((data: CheckInActionData) => {
    if (data.status !== "success") return;
    setTodayRows((prev) => [
      {
        id: `optimistic-${data.memberId}-${data.checkedInAt.getTime()}`,
        memberId: data.memberId,
        memberNumber: data.memberNumber,
        memberName: data.memberName,
        checkedInAt: data.checkedInAt,
        method: "manual",
        dateKey: "",
      },
      ...prev.filter(
        (row) =>
          !(
            row.memberId === data.memberId &&
            row.checkedInAt.toDateString() === data.checkedInAt.toDateString()
          ),
      ),
    ]);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <CheckInForm onSuccess={handleSuccess} />
          ) : (
            <p className="text-sm text-muted-foreground">
              You do not have permission to mark attendance.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTodayTable rows={todayRows} />
          </CardContent>
        </Card>

        <HistoryLookup />
      </div>
    </div>
  );
}
