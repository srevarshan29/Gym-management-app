import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron-auth";
import { runMembershipExpiryRemindersJob } from "@/lib/membership-expiry-reminders/run-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await runMembershipExpiryRemindersJob();
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error("[cron/membership-expiry-reminders] job failed:", err);
    return NextResponse.json({ error: "Job failed." }, { status: 500 });
  }
}
