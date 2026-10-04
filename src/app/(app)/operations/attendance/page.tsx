import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { AttendanceKioskClient } from "@/components/attendance-kiosk-client";

export default async function AttendanceKioskPage() {
  const user = await requireGym();
  const canManage = canManageMembers(user.role);

  return <AttendanceKioskClient canManage={canManage} />;
}
