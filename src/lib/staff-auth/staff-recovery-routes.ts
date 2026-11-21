export const STAFF_PASSWORD_RECOVERY_PATHS = [
  "/forgot-password",
  "/reset-password",
] as const;

export function isStaffPasswordRecoveryPath(pathname: string): boolean {
  return STAFF_PASSWORD_RECOVERY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}