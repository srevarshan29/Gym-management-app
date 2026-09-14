import { getRepositories, platformContext } from "@/lib/firestore";

export const PAYMENTS_PAGE_SIZE = 50;

export type PaidPaymentRow = {
  id: string;
  paidAt: Date;
  amount: number;
  method: string;
  member: { id: string; name: string };
  subscription: { package: { name: string } } | null;
  recordedBy: { name: string } | null;
};

export type PaidPaymentsPageResult = {
  rows: PaidPaymentRow[];
  matchingCount: number;
  paymentCount: number;
  totalCollected: number;
  page: number;
  pageSize: number;
};

export async function getPaidPaymentsPage(
  tenantGymId: string,
  options: { page?: number; pageSize?: number; q?: string } = {},
): Promise<PaidPaymentsPageResult> {
  const { payments } = getRepositories();
  return payments.listPaidPage(platformContext, tenantGymId, options);
}
