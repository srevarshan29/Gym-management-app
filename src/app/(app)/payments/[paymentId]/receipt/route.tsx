import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { requireGym } from "@/lib/session";
import { canLogPayments } from "@/lib/permissions";
import { getOrCreateReceiptByPayment, formatReceiptNumber } from "@/lib/receipts";
import { ReceiptDocument } from "@/components/receipt-document";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } },
) {
  const user = await requireGym();
  if (!canLogPayments(user.role)) {
    return NextResponse.json(
      { error: "You do not have permission to view payment receipts." },
      { status: 403 },
    );
  }

  let receipt;
  try {
    receipt = await getOrCreateReceiptByPayment(user.gymId, params.paymentId);
  } catch {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  const buffer = await renderToBuffer(<ReceiptDocument receipt={receipt} />);
  const filename = `${formatReceiptNumber(receipt.number)}.pdf`;
  const download = request.nextUrl.searchParams.get("download") === "1";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
