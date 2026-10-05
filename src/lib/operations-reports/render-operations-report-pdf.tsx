import { renderToBuffer } from "@react-pdf/renderer";

import { OperationsReportPdfDocument } from "@/components/operations-report-pdf-document";
import type { OperationsReportPdfPayload } from "@/lib/operations-reports/pdf-export";

export async function renderOperationsReportPdfBuffer(
  payload: OperationsReportPdfPayload,
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <OperationsReportPdfDocument payload={payload} />,
  );
  return Buffer.from(buffer);
}
