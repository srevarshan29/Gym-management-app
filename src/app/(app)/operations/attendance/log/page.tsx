import Link from "next/link";

import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { getTodayAttendanceList } from "@/lib/attendance/queries";
import { PageHeader } from "@/components/page-header";
import { AttendanceStaffPageClient } from "@/components/attendance-staff-page-client";
import { Button } from "@/components/ui/button";

export default async function AttendanceLogPage() {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);
  const today = await getTodayAttendanceList(user.gymId);

  return (
    <div>
      <PageHeader
        title="Attendance log"
        description="Staff view of today's check-ins and member visit history."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/operations/attendance">Open check-in kiosk</Link>
        </Button>
      </PageHeader>
      <AttendanceStaffPageClient canManage={canManage} initialToday={today} />
    </div>
  );
}
