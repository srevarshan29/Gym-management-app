import type { Role } from "@prisma/client";

import { getGymProfilePlatform } from "@/lib/gym-profile";
import { getRepositories, platformContext } from "@/lib/firestore";
import { batchGetByIds } from "@/lib/firestore/batch-get";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { getFirestoreDb } from "@/lib/firebase/admin";
import type { MemberDoc } from "@/lib/firestore/types";
import {
  formatReportDateRangeLabel,
  resolveReportDateRange,
  type ReportDateRangeInput,
  type ResolvedReportDateRange,
} from "@/lib/operations-reports/date-range";
import {
  loadOperationsReportDashboard,
} from "@/lib/operations-reports/queries";
import type { OperationsReportDataset } from "@/lib/operations-reports/types";
import { isOperationsReportDataset } from "@/lib/operations-reports/types";
import { formatReceiptNumber } from "@/lib/receipt-display";
import { canViewFinancials } from "@/lib/permissions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { renderOperationsReportPdfBuffer } from "@/lib/operations-reports/render-operations-report-pdf";

export type OperationsReportPdfPayload = {
  gymName: string;
  title: string;
  rangeLabel: string;
  startDateKey: string;
  endDateKey: string;
  summaryLines: string[];
  headers: string[];
  rows: string[][];
  emptyMessage: string | null;
};

export const REPORT_PDF_TITLES: Record<OperationsReportDataset, string> = {
  attendance: "Attendance Report",
  members: "Members Report",
  payments: "Payments & Revenue Report",
  subscriptions: "Subscriptions Report",
};

export function operationsReportPdfFilename(
  dataset: OperationsReportDataset,
  range: Pick<ResolvedReportDateRange, "startDateKey" | "endDateKey">,
): string {
  const slug = dataset === "payments" ? "payments-revenue" : dataset;
  return `${slug}-report-${range.startDateKey}-to-${range.endDateKey}.pdf`;
}

export function reportTitleForDataset(dataset: OperationsReportDataset): string {
  return REPORT_PDF_TITLES[dataset];
}

function formatDateKeyDisplay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return formatDate(new Date(Date.UTC(y, m - 1, d)));
}

function formatMethodLabel(method: string): string {
  return method.replace(/_/g, " ");
}

export function buildSummaryLinesForDataset(
  dataset: OperationsReportDataset,
  dashboard: Awaited<ReturnType<typeof loadOperationsReportDashboard>>,
): string[] {
  switch (dataset) {
    case "attendance":
      return [
        `Total check-ins: ${dashboard.attendance.summary.totalCheckIns.toLocaleString("en-IN")}`,
        `Unique members: ${dashboard.attendance.summary.uniqueMembers.toLocaleString("en-IN")}`,
        `Average check-ins per member: ${dashboard.attendance.summary.averageCheckInsPerActiveMember.toFixed(1)}`,
      ];
    case "members":
      return [
        `New members: ${dashboard.members.metrics.newMembers}`,
        `Active members: ${dashboard.members.metrics.activeMembers}`,
        `Expiring in range: ${dashboard.members.metrics.expiringDuringPeriod}`,
        `Renewals in range: ${dashboard.members.metrics.renewalsDuringPeriod}`,
      ];
    case "payments":
      return [
        `Total collected: ${formatCurrency(dashboard.payments.metrics.totalCollected)}`,
        `Payments: ${dashboard.payments.metrics.paymentCount}`,
        `Average payment: ${formatCurrency(dashboard.payments.metrics.averagePayment)}`,
      ];
    case "subscriptions":
      return [
        `New subscriptions: ${dashboard.subscriptions.metrics.newSubscriptions}`,
        `Renewed: ${dashboard.subscriptions.metrics.renewedSubscriptions}`,
        `Active at period end: ${dashboard.subscriptions.metrics.activeMemberships}`,
        `Expired: ${dashboard.subscriptions.metrics.expiredMemberships}`,
      ];
  }
}

export async function buildOperationsReportPdfPayload(
  tenantGymId: string,
  dataset: OperationsReportDataset,
  range: ResolvedReportDateRange,
  canViewFinancialsFlag: boolean,
): Promise<OperationsReportPdfPayload> {
  const [profile, dashboard] = await Promise.all([
    getGymProfilePlatform(tenantGymId),
    loadOperationsReportDashboard(tenantGymId, range, {
      canViewFinancials: canViewFinancialsFlag,
      attendancePage: 1,
      paymentsPage: 1,
    }),
  ]);

  const summaryLines = buildSummaryLinesForDataset(dataset, dashboard);
  let headers: string[] = [];
  let rows: string[][] = [];
  let emptyMessage: string | null = null;

  if (dataset === "attendance") {
    headers = ["Date", "Member #", "Name", "Check-in", "Method"];
    if (dashboard.attendance.empty) {
      emptyMessage = "No attendance records for this date range.";
    } else {
      const { attendance } = getRepositories();
      const ctx = platformContext;
      for await (const row of attendance.iterateForDateKeyRange(
        ctx,
        tenantGymId,
        range.startDateKey,
        range.endDateKey,
      )) {
        rows.push([
          formatDateKeyDisplay(row.dateKey),
          String(row.memberNumber).padStart(4, "0"),
          row.memberName,
          formatDateTime(row.checkedInAt.toDate()),
          row.method,
        ]);
      }
    }
  } else if (dataset === "members") {
    headers = ["Member #", "Name", "Registered", "Package", "Status"];
    if (dashboard.members.empty) {
      emptyMessage = "No new members registered in this date range.";
    } else {
      rows = dashboard.members.rows.map((row) => [
        String(row.memberNumber).padStart(4, "0"),
        row.name,
        formatDate(row.registeredAt),
        row.packageName ?? "—",
        row.statusLabel,
      ]);
    }
  } else if (dataset === "payments") {
    headers = ["Date", "Member #", "Name", "Amount", "Method", "Receipt"];
    if (dashboard.payments.empty) {
      emptyMessage = "No payments recorded for this date range.";
    } else {
      const ctx = platformContext;
      const { members, payments, receipts } = getRepositories();
      const memberDocs = await members.listAllByGym(ctx, tenantGymId);
      const memberCache = new Map(memberDocs.map((m) => [m.id, m]));
      const all = await payments.listAllPaidInRange(
        ctx,
        tenantGymId,
        range.startInstant,
        range.endInstant,
      );
      const receiptMap = await receipts.mapReceiptNumbersByPaymentIds(
        ctx,
        tenantGymId,
        all.map((p) => p.id),
      );
      const db = getFirestoreDb();
      for (const p of all) {
        let member = memberCache.get(p.memberId);
        if (!member) {
          const loaded = await batchGetByIds<MemberDoc>(
            db,
            COLLECTIONS.members,
            [p.memberId],
          );
          const fallback = loaded.get(p.memberId);
          if (fallback) {
            member = { id: p.memberId, ...fallback };
            memberCache.set(p.memberId, member);
          }
        }
        const receiptNo = receiptMap.get(p.id);
        rows.push([
          formatDate(p.paidAt.toDate()),
          String(member?.memberNumber ?? 0).padStart(4, "0"),
          member?.name ?? "Unknown",
          formatCurrency(p.amount),
          formatMethodLabel(p.method),
          receiptNo != null ? formatReceiptNumber(receiptNo) : "—",
        ]);
      }
    }
  } else {
    headers = ["Member #", "Name", "Package", "Type", "Start", "End"];
    if (dashboard.subscriptions.empty) {
      emptyMessage = "No subscription activity in this date range.";
    } else {
      rows = dashboard.subscriptions.rows.map((row) => [
        String(row.memberNumber).padStart(4, "0"),
        row.memberName,
        row.packageName,
        row.kind,
        formatDate(row.startDate),
        formatDate(row.endDate),
      ]);
    }
  }

  return {
    gymName: profile.name,
    title: reportTitleForDataset(dataset),
    rangeLabel: formatReportDateRangeLabel(range),
    startDateKey: range.startDateKey,
    endDateKey: range.endDateKey,
    summaryLines,
    headers,
    rows,
    emptyMessage,
  };
}

export type OperationsReportPdfDownloadResult =
  | { ok: true; buffer: Buffer; filename: string }
  | { ok: false; status: number; error: string };

export async function createOperationsReportPdfDownload(
  tenantGymId: string,
  role: Role,
  input: ReportDateRangeInput & { dataset: string | null },
): Promise<OperationsReportPdfDownloadResult> {
  if (!input.dataset || !isOperationsReportDataset(input.dataset)) {
    return { ok: false, status: 400, error: "Invalid dataset." };
  }
  const dataset = input.dataset;
  if (dataset === "payments" && !canViewFinancials(role)) {
    return { ok: false, status: 403, error: "Forbidden." };
  }

  const resolved = resolveReportDateRange(input);
  if (!resolved.ok) {
    return { ok: false, status: 400, error: resolved.error };
  }

  const payload = await buildOperationsReportPdfPayload(
    tenantGymId,
    dataset,
    resolved.range,
    canViewFinancials(role),
  );
  const buffer = await renderOperationsReportPdfBuffer(payload);
  return {
    ok: true,
    buffer,
    filename: operationsReportPdfFilename(dataset, resolved.range),
  };
}
