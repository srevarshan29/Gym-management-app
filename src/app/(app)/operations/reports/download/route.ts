import { NextResponse } from "next/server";

import {
  buildReportCsv,
  canDownloadReportModule,
  isReportModuleId,
} from "@/lib/reports-export";
import { requireGymForApi } from "@/lib/session";

export async function GET(request: Request) {
  const authResult = await requireGymForApi();
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult;

  const moduleParam = new URL(request.url).searchParams.get("module");
  if (!moduleParam || !isReportModuleId(moduleParam)) {
    return NextResponse.json({ error: "Invalid module." }, { status: 400 });
  }

  if (!canDownloadReportModule(user.role, moduleParam)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { filename, body } = await buildReportCsv(user.gymId, moduleParam);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
