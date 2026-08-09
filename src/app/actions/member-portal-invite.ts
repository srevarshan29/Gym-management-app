"use server";

import { revalidatePath } from "next/cache";

import { requireGym } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

export async function enableMemberPortalAccess(
  memberId: string,
): Promise<ActionResult<{ loginUrl: string }>> {
  const user = await requireGym();

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId: user.gymId },
    select: {
      id: true,
      email: true,
      portalEnabledAt: true,
      gym: { select: { registrationToken: true } },
    },
  });
  if (!member) {
    return actionError("Member not found.");
  }

  const email = member.email?.trim();
  if (!email) {
    return actionError(
      "Add an email address on this member profile before enabling the portal.",
    );
  }

  if (!member.portalEnabledAt) {
    await prisma.member.update({
      where: { id: member.id },
      data: { portalEnabledAt: new Date() },
    });
  }

  revalidatePath(`/members/${memberId}`);

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const loginUrl = `${base}/member/login/${member.gym.registrationToken}`;

  return actionOk(
    member.portalEnabledAt
      ? "Portal is active. Copy the login link below."
      : "Member portal enabled. Copy the login link below.",
    { loginUrl },
  );
}
