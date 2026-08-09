import { redirect } from "next/navigation";

import { memberAuth, memberSignOut } from "@/member-auth";
import { resolveMemberLoginRedirect } from "@/lib/member-session";

export async function GET() {
  const session = await memberAuth();
  const loginPath = await resolveMemberLoginRedirect(session?.user?.gymId);
  await memberSignOut({ redirect: false });
  redirect(loginPath);
}
