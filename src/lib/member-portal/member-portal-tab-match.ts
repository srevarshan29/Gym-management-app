export type MemberPortalTabMatch = "overview" | "workout" | "tools" | "profile";

/** Whether the current pathname belongs to a bottom-nav tab. */
export function isMemberPortalTabActive(
  pathname: string,
  match: MemberPortalTabMatch,
): boolean {
  switch (match) {
    case "overview":
      return pathname === "/member";
    case "workout":
      return (
        pathname === "/member/workout" ||
        pathname.startsWith("/member/workout/")
      );
    case "profile":
      return (
        pathname === "/member/profile" ||
        pathname.startsWith("/member/profile/")
      );
    case "tools":
      return (
        pathname === "/member/tools" ||
        pathname.startsWith("/member/tools/") ||
        pathname === "/member/payments" ||
        pathname.startsWith("/member/payments/") ||
        pathname === "/member/diet" ||
        pathname.startsWith("/member/diet/") ||
        pathname === "/member/events" ||
        pathname.startsWith("/member/events/") ||
        pathname === "/member/nutrition" ||
        pathname.startsWith("/member/nutrition/")
      );
    default:
      return false;
  }
}
