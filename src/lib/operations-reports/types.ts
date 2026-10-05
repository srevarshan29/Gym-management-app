import type { AttendanceListItem } from "@/lib/attendance/types";
import type { PaymentMethod } from "@/lib/firestore/types";
import type { ResolvedReportDateRange } from "@/lib/operations-reports/date-range";
import type {
  AttendanceReportSummary,
  MemberReportMetrics,
  PaymentReportMetrics,
  SubscriptionReportMetrics,
} from "@/lib/operations-reports/metrics";

export type OperationsReportPaymentRow = {
  id: string;
  paidAt: Date;
  memberNumber: number;
  memberName: string;
  amount: number;
  method: PaymentMethod;
  receiptNumber: string;
};

export type OperationsReportMemberRow = {
  memberNumber: number;
  name: string;
  phone: string;
  packageName: string | null;
  registeredAt: Date;
  statusLabel: string;
};

export type OperationsReportSubscriptionRow = {
  memberNumber: number;
  memberName: string;
  packageName: string;
  kind: "New" | "Renewal";
  startDate: Date;
  endDate: Date;
  createdAt: Date;
};

export type OperationsReportDashboard = {
  range: ResolvedReportDateRange;
  rangeLabel: string;
  summary: {
    totalCheckIns: number;
    newMembers: number;
    totalRevenue: number;
    renewals: number;
  };
  attendance: {
    summary: AttendanceReportSummary;
    rows: AttendanceListItem[];
    totalRows: number;
    page: number;
    pageSize: number;
    empty: boolean;
  };
  members: {
    metrics: MemberReportMetrics;
    rows: OperationsReportMemberRow[];
    empty: boolean;
  };
  payments: {
    metrics: PaymentReportMetrics;
    rows: OperationsReportPaymentRow[];
    totalRows: number;
    page: number;
    pageSize: number;
    canView: boolean;
    empty: boolean;
  };
  subscriptions: {
    metrics: SubscriptionReportMetrics;
    rows: OperationsReportSubscriptionRow[];
    empty: boolean;
  };
};

export const OPERATIONS_REPORT_DATASETS = [
  "attendance",
  "members",
  "payments",
  "subscriptions",
] as const;

export type OperationsReportDataset =
  (typeof OPERATIONS_REPORT_DATASETS)[number];

export function isOperationsReportDataset(
  value: string,
): value is OperationsReportDataset {
  return (OPERATIONS_REPORT_DATASETS as readonly string[]).includes(value);
}
