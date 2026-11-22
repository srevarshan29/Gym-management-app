import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron-auth";
import { runGymDeletionPurgeCronJob } from "@/lib/gym-lifecycle/cron/run-gym-deletion-purge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Not registered in vercel.json by default — enable only after backup + purge flags are set. */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await runGymDeletionPurgeCronJob();
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error("[cron/gym-deletion-purge] job failed:", err);
    return NextResponse.json({ error: "Job failed." }, { status: 500 });
  }
}