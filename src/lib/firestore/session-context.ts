import type { StaffContext } from "@/lib/firestore/context";
import type { GymSessionUser, SessionUser } from "@/lib/session";

export function staffContextFromUser(user: GymSessionUser): StaffContext {
  return {
    kind: "staff",
    userId: user.id,
    gymId: user.gymId,
    role: user.role,
  };
}

export function staffContextFromSession(user: SessionUser & { gymId: string }): StaffContext {
  return staffContextFromUser(user as GymSessionUser);
}
