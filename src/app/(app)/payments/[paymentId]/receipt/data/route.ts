import { NextResponse } from "next/server";

import { canLogPayments } from "@/lib/permissions";
import { serializeReceiptPreviewData } from "@/lib/receipt-preview";
import { getOrCreateReceiptByPayment } from "@/lib/receipts";
import { requireGym } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { paymentId: string } },
) {
  const user = await requireGym();
  if (!canLogPayments(user.role)) {
    return NextResponse.json(
      { error: "You do not have permission to view payment receipts." },
      { status: 403 },
    );
  }

  try {
    const receipt = await getOrCreateReceiptByPayment(user.gymId, params.paymentId);
    return NextResponse.json(
      { receipt: serializeReceiptPreviewData(receipt) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }
}
