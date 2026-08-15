import { NextResponse } from "next/server";

import { csvHeaderLine } from "@/lib/csv";
import {
  iterateReportCsvChunks,
  MEMBER_CSV_HEADERS,
  PAYMENT_CSV_HEADERS,
} from "@/lib/reports-csv-stream";
import {
  buildReportCsv,
  canDownloadReportModule,
  isReportModuleId,
  isStreamedReportModule,
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

  const stamp = new Date().toISOString().slice(0, 10);

  if (isStreamedReportModule(moduleParam)) {
    const filename = `${moduleParam}-${stamp}.csv`;
    const headers =
      moduleParam === "members" ? MEMBER_CSV_HEADERS : PAYMENT_CSV_HEADERS;
    const encoder = new TextEncoder();
    const gymId = user.gymId;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(csvHeaderLine([...headers])));
          for await (const chunk of iterateReportCsvChunks(gymId, moduleParam)) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
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
