import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron-auth";
import { runInactiveMemberRemindersJob } from "@/lib/inactive-member-reminders/send";
import { runMembershipExpiryRemindersJob } from "@/lib/membership-expiry-reminders/run-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const expiryStats = await runMembershipExpiryRemindersJob();
    const inactiveStats = await runInactiveMemberRemindersJob();
    return NextResponse.json({ ok: true, stats: { expiry: expiryStats, inactive: inactiveStats } });
  } catch (err) {
    console.error("[cron/membership-expiry-reminders] job failed:", err);
    return NextResponse.json({ error: "Job failed." }, { status: 500 });
  }
}
