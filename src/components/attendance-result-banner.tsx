import { formatMemberNumber } from "@/lib/receipt-display";
import type { AttendanceCheckInResult } from "@/lib/attendance/types";
import { formatDateTime } from "@/lib/utils";

type AttendanceResultBannerProps = {
  result: AttendanceCheckInResult;
};

export function AttendanceResultBanner({ result }: AttendanceResultBannerProps) {
  switch (result.status) {
    case "success":
      return (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50"
          role="status"
        >
          <p className="font-semibold">✅ Attendance marked</p>
          <p className="mt-1">{formatMemberNumber(result.memberNumber)}</p>
          <p>{result.memberName}</p>
          <p className="mt-1 text-sm opacity-90">
            Today, {formatDateTime(result.checkedInAt).split(", ").slice(1).join(", ") ||
              formatDateTime(result.checkedInAt)}
          </p>
        </div>
      );
    case "not_found":
      return (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-50"
          role="alert"
        >
          <p className="font-semibold">
            ❌ Member {result.memberNumberLabel} not found.
          </p>
        </div>
      );
    case "membership_expired":
      return (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-50"
          role="status"
        >
          <p className="font-semibold">⚠️ Membership expired</p>
          <p className="mt-1">{result.memberName}</p>
          <p className="text-sm opacity-90">Attendance was not marked.</p>
        </div>
      );
    default:
      return null;
  }
}
