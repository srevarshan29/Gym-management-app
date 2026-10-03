import {
  getRepositories,
  platformContext,
  type FirestoreContext,
} from "@/lib/firestore";
import { formatReceiptNumber } from "@/lib/receipt-display";

export type ReceiptData = {
  id: string;
  number: number;
  createdAt: Date;
  gymName: string;
  gymAddress: string | null;
  gymPhone: string | null;
  gymLogoUrl: string | null;
  /** Internal Firestore member document ID (not shown on receipts). */
  memberId: string;
  /** Snapshot at creation; null on legacy receipts until resolved from member. */
  memberNumber: number | null;
  /** Formatted customer-facing Member ID, e.g. #0078. */
  memberDisplayId: string;
  memberName: string;
  memberPhone: string;
  memberEmail: string | null;
  packageName: string | null;
  amount: number;
  amountOwed: number | null;
  balanceAfter: number | null;
  method: string;
  paidAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
};

export { formatReceiptNumber };

export async function getOrCreateReceiptByPayment(
  tenantGymId: string,
  paymentId: string,
): Promise<ReceiptData> {
  const { receipts } = getRepositories();
  return receipts.getOrCreateByPayment(platformContext, tenantGymId, paymentId);
}

/** @deprecated Use billing operations — kept for type compatibility during migration. */
export async function createReceiptForPayment(
  _tx: unknown,
  tenantGymId: string,
  paymentId: string,
): Promise<ReceiptData & { number: number }> {
  void _tx;
  const data = await getOrCreateReceiptByPayment(tenantGymId, paymentId);
  return data;
}
