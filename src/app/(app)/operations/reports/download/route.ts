import { NextResponse } from "next/server";

import { csvHeaderLine } from "@/lib/csv";
import {
  ATTENDANCE_CSV_HEADERS,
  iterateOperationsReportCsvRows,
  MEMBERS_CSV_HEADERS,
  PAYMENTS_CSV_HEADERS,
  SUBSCRIPTIONS_CSV_HEADERS,
} from "@/lib/operations-reports/queries";
import {
  isOperationsReportDataset,
  type OperationsReportDataset,
} from "@/lib/operations-reports/types";
import { createOperationsReportPdfDownload } from "@/lib/operations-reports/pdf-export";
import { resolveReportDateRange } from "@/lib/operations-reports/date-range";
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
import { canViewFinancials } from "@/lib/permissions";
import { requireGymForApi } from "@/lib/session";

const DATASET_HEADERS: Record<OperationsReportDataset, readonly string[]> = {
  attendance: ATTENDANCE_CSV_HEADERS,
  members: MEMBERS_CSV_HEADERS,
  payments: PAYMENTS_CSV_HEADERS,
  subscriptions: SUBSCRIPTIONS_CSV_HEADERS,
};

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireGymForApi();
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult;

  const url = new URL(request.url);
  const datasetParam = url.searchParams.get("dataset");
  if (datasetParam) {
    if (!isOperationsReportDataset(datasetParam)) {
      return NextResponse.json({ error: "Invalid dataset." }, { status: 400 });
    }
    if (datasetParam === "payments" && !canViewFinancials(user.role)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const rangeInput = {
      preset: url.searchParams.get("preset"),
      start: url.searchParams.get("start"),
      end: url.searchParams.get("end"),
    };

    if (url.searchParams.get("format") === "pdf") {
      const pdf = await createOperationsReportPdfDownload(user.gymId, user.role, {
        dataset: datasetParam,
        ...rangeInput,
      });
      if (!pdf.ok) {
        return NextResponse.json({ error: pdf.error }, { status: pdf.status });
      }
      return new NextResponse(new Uint8Array(pdf.buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${pdf.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const resolved = resolveReportDateRange(rangeInput);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }

    const stamp = `${resolved.range.startDateKey}_${resolved.range.endDateKey}`;
    const filename = `${datasetParam}-${stamp}.csv`;
    const headers = DATASET_HEADERS[datasetParam];
    const encoder = new TextEncoder();
    const gymId = user.gymId;
    const canViewPayments = canViewFinancials(user.role);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(csvHeaderLine([...headers])));
          for await (const chunk of iterateOperationsReportCsvRows(
            gymId,
            datasetParam,
            resolved.range,
            canViewPayments,
          )) {
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

  const moduleParam = url.searchParams.get("module");
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
