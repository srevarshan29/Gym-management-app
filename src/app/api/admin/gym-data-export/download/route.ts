import { NextResponse } from "next/server";
import { z } from "zod";

import { redeemAndLoadGymExportArtifact } from "@/lib/gym-lifecycle/export/gym-data-export-download";
import { requireSuperAdminForApi } from "@/lib/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  gymId: z.string().trim().min(1).max(128),
  exportId: z.string().trim().min(1).max(128),
  downloadToken: z.string().trim().min(16).max(256),
});

export async function POST(request: Request) {
  const auth = await requireSuperAdminForApi();
  if (auth instanceof NextResponse) return auth;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const result = await redeemAndLoadGymExportArtifact({
    gymId: parsed.data.gymId,
    exportId: parsed.data.exportId,
    bearerToken: parsed.data.downloadToken,
    superAdminUserId: auth.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(new Uint8Array(result.body), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}