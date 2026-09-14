import {
  getRepositories,
  platformContext,
  type FirestoreContext,
} from "@/lib/firestore";
import { formatReceiptNumber } from "@/lib/firestore/repositories/receipts";

export type ReceiptData = {
  id: string;
  number: number;
  createdAt: Date;
  gymName: string;
  gymAddress: string | null;
  gymPhone: string | null;
  gymLogoUrl: string | null;
  memberId: string;
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

function toReceiptData(
  receipt: Awaited<
    ReturnType<
      ReturnType<typeof getRepositories>["receipts"]["findByPaymentId"]
    >
  > & { id: string },
): ReceiptData {
  return {
    id: receipt.id,
    number: receipt.number,
    createdAt: receipt.createdAt.toDate(),
    gymName: receipt.gymName,
    gymAddress: receipt.gymAddress,
    gymPhone: receipt.gymPhone,
    gymLogoUrl: receipt.gymLogoUrl,
    memberId: receipt.memberId,
    memberName: receipt.memberName,
    memberPhone: receipt.memberPhone,
    memberEmail: receipt.memberEmail,
    packageName: receipt.packageName,
    amount: receipt.amount,
    amountOwed: receipt.amountOwed,
    balanceAfter: receipt.balanceAfter,
    method: receipt.method,
    paidAt: receipt.paidAt.toDate(),
    periodStart: receipt.periodStart?.toDate() ?? null,
    periodEnd: receipt.periodEnd?.toDate() ?? null,
  };
}

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
