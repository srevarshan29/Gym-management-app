import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getTodayAttendanceList } from "@/lib/attendance/queries";
import { PageHeader } from "@/components/page-header";
import { AttendancePageClient } from "@/components/attendance-page-client";

export default async function AttendancePage() {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);
  const today = await getTodayAttendanceList(user.gymId);

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Front-desk check-in by member number. Press Enter after typing the number."
      />
      <AttendancePageClient canManage={canManage} initialToday={today} />
    </div>
  );
}
