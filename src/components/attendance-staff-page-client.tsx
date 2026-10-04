"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  loadMemberAttendanceHistoryAction,
  type MemberAttendanceHistoryData,
} from "@/app/actions/attendance";
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

type AttendanceStaffPageClientProps = {
  canManage: boolean;
  initialToday: AttendanceListItem[];
};

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

export function AttendanceStaffPageClient({
  canManage,
  initialToday,
}: AttendanceStaffPageClientProps) {
  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view attendance records.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceTodayTable rows={initialToday} />
        </CardContent>
      </Card>

      <HistoryLookup />
    </div>
  );
}
