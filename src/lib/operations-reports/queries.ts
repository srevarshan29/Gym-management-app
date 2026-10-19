import { csvDataLine } from "@/lib/csv";
import { getRepositories, platformContext } from "@/lib/firestore";
import { batchGetByIds } from "@/lib/firestore/batch-get";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import { getFirestoreDb } from "@/lib/firebase/admin";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { MemberDoc, SubscriptionDoc } from "@/lib/firestore/types";
import {
  formatReportDateRangeLabel,
  type ResolvedReportDateRange,
} from "@/lib/operations-reports/date-range";
import {
  computeAttendanceSummaryFromCount,
  computeMemberReportMetrics,
  computeSubscriptionReportMetrics,
  type MemberRowForReport,
  type SubscriptionRowForReport,
} from "@/lib/operations-reports/metrics";
import { resolveRangePageStartAfterId } from "@/lib/operations-reports/pagination";
import { measureServerPhase } from "@/lib/server-perf";
import type {
  OperationsReportDashboard,
  OperationsReportMemberRow,
  OperationsReportPaymentRow,
  OperationsReportSubscriptionRow,
} from "@/lib/operations-reports/types";
import { formatReceiptNumber } from "@/lib/receipt-display";
import { STATUS_LABEL, statusFromEndDate } from "@/lib/subscription";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export const OPERATIONS_REPORT_ATTENDANCE_PAGE_SIZE = 50;
export const OPERATIONS_REPORT_PAYMENTS_PAGE_SIZE = 50;

function mapSubscriptions(
  rows: DocWithId<SubscriptionDoc>[],
): SubscriptionRowForReport[] {
  return rows.map((sub) => ({
    id: sub.id,
    memberId: sub.memberId,
    memberName: sub.memberName,
    memberNumber: sub.memberNumber,
    packageName: sub.packageName,
    startDate: sub.startDate.toDate(),
    endDate: sub.endDate.toDate(),
    createdAt: sub.createdAt.toDate(),
  }));
}

/**
 * Loads the subscription rows needed for report metrics/tables without scanning
 * the gym's full subscription history. Members who can affect the selected
 * range are those with a subscription created in range or a cycle start in
 * range; each candidate's full per-member history is loaded for earliest vs
 * renewal classification.
 */
export async function loadReportSubscriptionDocs(
  ctx: FirestoreContext,
  tenantGymId: string,
  range: ResolvedReportDateRange,
): Promise<DocWithId<SubscriptionDoc>[]> {
  const { subscriptions } = getRepositories();
  const [createdInRange, startsInRange] = await Promise.all([
    subscriptions.listWithCreatedAtInRange(
      ctx,
      tenantGymId,
      range.startInstant,
      range.endInstant,
    ),
    subscriptions.listWithStartDateInRange(
      ctx,
      tenantGymId,
      range.startInstant,
      range.endInstant,
    ),
  ]);

  const memberIds = new Set<string>();
  for (const sub of createdInRange) {
    memberIds.add(sub.memberId);
  }
  for (const sub of startsInRange) {
    memberIds.add(sub.memberId);
  }

  if (memberIds.size === 0) return [];

  const ids = [...memberIds];
  const CHUNK_SIZE = 50;
  const byId = new Map<string, DocWithId<SubscriptionDoc>>();

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const lists = await Promise.all(
      chunk.map((memberId) =>
        subscriptions.listByMember(ctx, tenantGymId, memberId),
      ),
    );
    for (const list of lists) {
      for (const sub of list) {
        byId.set(sub.id, sub);
      }
    }
  }

  return [...byId.values()];
}

function mapMembers(
  rows: Awaited<
    ReturnType<ReturnType<typeof getRepositories>["members"]["listAllByGym"]>
  >,
): MemberRowForReport[] {
  return rows.map((m) => ({
    id: m.id,
    memberNumber: m.memberNumber,
    name: m.name,
    createdAt: m.createdAt.toDate(),
    endDate: m.currentEndDate?.toDate() ?? null,
  }));
}

export function earliestSubscriptionStartByMember(
  subscriptions: SubscriptionRowForReport[],
): Map<string, Date> {
  const earliestStartByMember = new Map<string, Date>();
  for (const sub of subscriptions) {
    const existing = earliestStartByMember.get(sub.memberId);
    if (!existing || sub.startDate < existing) {
      earliestStartByMember.set(sub.memberId, sub.startDate);
    }
  }
  return earliestStartByMember;
}

export function memberIdsWithEarliestStartInRange(
  subscriptions: SubscriptionRowForReport[],
  range: ResolvedReportDateRange,
): string[] {
  const earliestStartByMember = earliestSubscriptionStartByMember(subscriptions);
  const ids: string[] = [];
  for (const [memberId, earliest] of earliestStartByMember) {
    if (earliest >= range.startInstant && earliest < range.endInstant) {
      ids.push(memberId);
    }
  }
  return ids;
}

export async function loadMemberDocMapForIds(
  ctx: FirestoreContext,
  memberIds: string[],
): Promise<Map<string, MemberDoc>> {
  if (memberIds.length === 0) return new Map();
  const db = getFirestoreDb();
  const loaded = await batchGetByIds<MemberDoc>(
    db,
    COLLECTIONS.members,
    memberIds,
  );
  return loaded;
}

export function buildNewMemberRows(
  subscriptions: SubscriptionRowForReport[],
  range: ResolvedReportDateRange,
  memberDocs: Map<string, MemberDoc>,
): OperationsReportMemberRow[] {
  const earliestStartByMember = earliestSubscriptionStartByMember(subscriptions);
  const profileByMember = new Map<
    string,
    Pick<SubscriptionRowForReport, "memberNumber" | "memberName">
  >();
  for (const sub of subscriptions) {
    if (!profileByMember.has(sub.memberId)) {
      profileByMember.set(sub.memberId, {
        memberNumber: sub.memberNumber,
        memberName: sub.memberName,
      });
    }
  }

  const rows: OperationsReportMemberRow[] = [];
  for (const [memberId, earliest] of earliestStartByMember) {
    if (earliest < range.startInstant || earliest >= range.endInstant) continue;
    const doc = memberDocs.get(memberId);
    const profile = profileByMember.get(memberId);
    const endDate = doc?.currentEndDate?.toDate() ?? null;
    rows.push({
      memberNumber: doc?.memberNumber ?? profile?.memberNumber ?? 0,
      name: doc?.name ?? profile?.memberName ?? "Unknown",
      phone: doc?.phone ?? "",
      packageName: doc?.currentPackageName ?? null,
      registeredAt: earliest,
      statusLabel: STATUS_LABEL[statusFromEndDate(endDate, range.asOfInstant)],
    });
  }
  rows.sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());
  return rows;
}

export function buildSubscriptionTableRows(
  subscriptions: SubscriptionRowForReport[],
  range: ResolvedReportDateRange,
): OperationsReportSubscriptionRow[] {
  const earliestStartByMember = new Map<string, Date>();
  for (const sub of subscriptions) {
    const existing = earliestStartByMember.get(sub.memberId);
    if (!existing || sub.startDate < existing) {
      earliestStartByMember.set(sub.memberId, sub.startDate);
    }
  }

  const rows: OperationsReportSubscriptionRow[] = [];
  for (const sub of subscriptions) {
    if (sub.createdAt < range.startInstant || sub.createdAt >= range.endInstant) {
      continue;
    }
    const earliest = earliestStartByMember.get(sub.memberId);
    const kind =
      earliest && earliest.getTime() === sub.startDate.getTime()
        ? "New"
        : "Renewal";
    rows.push({
      memberNumber: sub.memberNumber,
      memberName: sub.memberName,
      packageName: sub.packageName,
      kind,
      startDate: sub.startDate,
      endDate: sub.endDate,
      createdAt: sub.createdAt,
    });
  }
  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return rows;
}

async function loadAttendanceMemberIdsForSummary(
  ctx: FirestoreContext,
  gymId: string,
  range: ResolvedReportDateRange,
): Promise<string[]> {
  const { attendance } = getRepositories();
  const memberIds: string[] = [];
  for await (const row of attendance.iterateForDateKeyRange(
    ctx,
    gymId,
    range.startDateKey,
    range.endDateKey,
  )) {
    memberIds.push(row.memberId);
  }
  return memberIds;
}

export async function loadOperationsReportDashboard(
  tenantGymId: string,
  range: ResolvedReportDateRange,
  options: {
    canViewFinancials: boolean;
    attendancePage?: number;
    paymentsPage?: number;
    /** `ac` query param — startAfter id for the current attendance page. */
    attendanceStartAfterId?: string | null;
    /** `pc` query param — startAfter id for the current payments page. */
    paymentsStartAfterId?: string | null;
  },
): Promise<OperationsReportDashboard> {
  return measureServerPhase("staff.reports.dashboard", async () => {
    const ctx = platformContext;
    const { attendance, members, payments, receipts } = getRepositories();

    const attendancePage = Math.max(1, options.attendancePage ?? 1);
    const paymentsPage = Math.max(1, options.paymentsPage ?? 1);

    const attendanceStartAfterId = await measureServerPhase(
      "staff.reports.attendance.cursor",
      () =>
        resolveRangePageStartAfterId(
          attendancePage,
          options.attendanceStartAfterId,
          (startAfterId) =>
            attendance.listForDateKeyRange(
              ctx,
              tenantGymId,
              range.startDateKey,
              range.endDateKey,
              {
                limit: OPERATIONS_REPORT_ATTENDANCE_PAGE_SIZE,
                startAfterId,
              },
            ),
        ),
    );

    const paymentsStartAfterId = options.canViewFinancials
      ? await measureServerPhase("staff.reports.payments.cursor", () =>
          resolveRangePageStartAfterId(
            paymentsPage,
            options.paymentsStartAfterId,
            (startAfterId) =>
              payments.listPaidInRange(
                ctx,
                tenantGymId,
                range.startInstant,
                range.endInstant,
                {
                  limit: OPERATIONS_REPORT_PAYMENTS_PAGE_SIZE,
                  startAfterId,
                },
              ),
          ),
        )
      : null;

    const attendanceTotal = await attendance.countForDateKeyRange(
      ctx,
      tenantGymId,
      range.startDateKey,
      range.endDateKey,
    );

    const [
      attendanceBatch,
      attendanceMemberIds,
      memberDocs,
      subscriptionDocs,
      paymentMetrics,
      paymentPageBatch,
    ] = await measureServerPhase("staff.reports.parallelLoad", () =>
      Promise.all([
        attendance.listForDateKeyRange(
          ctx,
          tenantGymId,
          range.startDateKey,
          range.endDateKey,
          {
            limit: OPERATIONS_REPORT_ATTENDANCE_PAGE_SIZE,
            startAfterId: attendanceStartAfterId,
          },
        ),
        attendanceTotal > 0
          ? measureServerPhase("staff.reports.attendance.uniqueMembers", () =>
              loadAttendanceMemberIdsForSummary(ctx, tenantGymId, range),
            )
          : Promise.resolve([] as string[]),
        measureServerPhase("staff.reports.members.roster", () =>
          members.listAllByGym(ctx, tenantGymId),
        ),
        measureServerPhase("staff.reports.subscriptions", () =>
          loadReportSubscriptionDocs(ctx, tenantGymId, range),
        ),
        options.canViewFinancials
          ? payments.summarizePaidInRange(
              ctx,
              tenantGymId,
              range.startInstant,
              range.endInstant,
            )
          : Promise.resolve(null),
        options.canViewFinancials
          ? payments.listPaidInRange(
              ctx,
              tenantGymId,
              range.startInstant,
              range.endInstant,
              {
                limit: OPERATIONS_REPORT_PAYMENTS_PAGE_SIZE,
                startAfterId: paymentsStartAfterId,
              },
            )
          : Promise.resolve({ rows: [], nextCursor: null }),
      ]),
    );

    const attendanceSummary = computeAttendanceSummaryFromCount(
      attendanceTotal,
      attendanceMemberIds,
    );

    const memberRows = mapMembers(memberDocs);
    const subscriptionRows = mapSubscriptions(subscriptionDocs);

    const attendanceListItems = attendance.mapListItems(attendanceBatch.rows);

    const memberMetrics = computeMemberReportMetrics(
      memberRows,
      subscriptionRows,
      range,
    );

    const newMemberIds = memberIdsWithEarliestStartInRange(
      subscriptionRows,
      range,
    );
    const newMemberDocMap = await measureServerPhase(
      "staff.reports.members.newTable",
      () => loadMemberDocMapForIds(ctx, newMemberIds),
    );
    const memberTableRows = buildNewMemberRows(
      subscriptionRows,
      range,
      newMemberDocMap,
    );

    const paymentTotalRows = paymentMetrics?.paymentCount ?? 0;
    const paymentPageDocs = paymentPageBatch.rows;

    const paymentMemberDocMap = options.canViewFinancials
      ? await measureServerPhase("staff.reports.payments.members", async () => {
          const ids = [...new Set(paymentPageDocs.map((p) => p.memberId))];
          return loadMemberDocMapForIds(ctx, ids);
        })
      : new Map<string, MemberDoc>();

    const receiptNumbers = options.canViewFinancials
      ? await receipts.mapReceiptNumbersByPaymentIds(
          ctx,
          tenantGymId,
          paymentPageDocs.map((p) => p.id),
        )
      : new Map<string, number>();

    const paymentTableRows: OperationsReportPaymentRow[] = paymentPageDocs.map(
      (p) => {
        const member = paymentMemberDocMap.get(p.memberId);
        const receiptNo = receiptNumbers.get(p.id);
        return {
          id: p.id,
          paidAt: p.paidAt.toDate(),
          memberNumber: member?.memberNumber ?? 0,
          memberName: member?.name ?? "Unknown",
          amount: p.amount,
          method: p.method,
          receiptNumber:
            receiptNo != null ? formatReceiptNumber(receiptNo) : "",
        };
      },
    );

    const subscriptionMetrics = computeSubscriptionReportMetrics(
      subscriptionRows,
      memberRows,
      range,
    );
    const subscriptionTableRows = buildSubscriptionTableRows(
      subscriptionRows,
      range,
    );

    const emptyPaymentMetrics = {
      totalCollected: 0,
      paymentCount: 0,
      averagePayment: 0,
      byMethod: [],
    };

    return {
      range,
      rangeLabel: formatReportDateRangeLabel(range),
      summary: {
        totalCheckIns: attendanceSummary.totalCheckIns,
        newMembers: memberMetrics.newMembers,
        totalRevenue: paymentMetrics?.totalCollected ?? 0,
        renewals: memberMetrics.renewalsDuringPeriod,
      },
      attendance: {
        summary: attendanceSummary,
        rows: attendanceListItems,
        totalRows: attendanceTotal,
        page: attendancePage,
        pageSize: OPERATIONS_REPORT_ATTENDANCE_PAGE_SIZE,
        nextPageStartAfter: attendanceBatch.nextCursor,
        empty: attendanceTotal === 0,
      },
      members: {
        metrics: memberMetrics,
        rows: memberTableRows,
        empty: memberTableRows.length === 0,
      },
      payments: {
        metrics: paymentMetrics ?? emptyPaymentMetrics,
        rows: paymentTableRows,
        totalRows: paymentTotalRows,
        page: paymentsPage,
        pageSize: OPERATIONS_REPORT_PAYMENTS_PAGE_SIZE,
        nextPageStartAfter: paymentPageBatch.nextCursor,
        canView: options.canViewFinancials,
        empty: paymentTotalRows === 0,
      },
      subscriptions: {
        metrics: subscriptionMetrics,
        rows: subscriptionTableRows,
        empty: subscriptionTableRows.length === 0,
      },
    };
  });
}

export const ATTENDANCE_CSV_HEADERS = [
  "Date",
  "Member Number",
  "Member Name",
  "Check-in Time",
  "Method",
] as const;

export const MEMBERS_CSV_HEADERS = [
  "Member Number",
  "Name",
  "Phone",
  "Package",
  "Registered",
  "Status",
] as const;

export const PAYMENTS_CSV_HEADERS = [
  "Date",
  "Member Number",
  "Member Name",
  "Amount",
  "Payment Method",
  "Receipt Number",
] as const;

export const SUBSCRIPTIONS_CSV_HEADERS = [
  "Member Number",
  "Member Name",
  "Package",
  "Type",
  "Start Date",
  "End Date",
  "Created",
] as const;

function formatMethodLabel(method: string): string {
  return method.replace(/_/g, " ");
}

export async function* iterateOperationsReportCsvRows(
  tenantGymId: string,
  dataset: "attendance" | "members" | "payments" | "subscriptions",
  range: ResolvedReportDateRange,
  canViewFinancials: boolean,
): AsyncGenerator<string, void, unknown> {
  const ctx = platformContext;
  const { attendance, payments, receipts } = getRepositories();

  if (dataset === "attendance") {
    for await (const row of attendance.iterateForDateKeyRange(
      ctx,
      tenantGymId,
      range.startDateKey,
      range.endDateKey,
    )) {
      yield csvDataLine([
        formatDateKeyDisplay(row.dateKey),
        String(row.memberNumber).padStart(4, "0"),
        row.memberName,
        formatDateTime(row.checkedInAt.toDate()),
        row.method,
      ]);
    }
    return;
  }

  const subscriptionDocs = await loadReportSubscriptionDocs(
    ctx,
    tenantGymId,
    range,
  );
  const subscriptionRows = mapSubscriptions(subscriptionDocs);

  if (dataset === "members") {
    const newMemberIds = memberIdsWithEarliestStartInRange(
      subscriptionRows,
      range,
    );
    const memberDocMap = await loadMemberDocMapForIds(ctx, newMemberIds);
    const rows = buildNewMemberRows(subscriptionRows, range, memberDocMap);
    for (const row of rows) {
      yield csvDataLine([
        String(row.memberNumber).padStart(4, "0"),
        row.name,
        row.phone,
        row.packageName ?? "",
        formatDate(row.registeredAt),
        row.statusLabel,
      ]);
    }
    return;
  }

  if (dataset === "subscriptions") {
    const rows = buildSubscriptionTableRows(subscriptionRows, range);
    for (const row of rows) {
      yield csvDataLine([
        String(row.memberNumber).padStart(4, "0"),
        row.memberName,
        row.packageName,
        row.kind,
        formatDate(row.startDate),
        formatDate(row.endDate),
        formatDate(row.createdAt),
      ]);
    }
    return;
  }

  if (dataset === "payments") {
    if (!canViewFinancials) return;
    const memberCache = new Map<string, MemberDoc>();

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
        member = loaded.get(p.memberId);
        if (member) memberCache.set(p.memberId, member);
      }
      const receiptNo = receiptMap.get(p.id);
      yield csvDataLine([
        formatDate(p.paidAt.toDate()),
        String(member?.memberNumber ?? 0).padStart(4, "0"),
        member?.name ?? "Unknown",
        formatCurrency(p.amount),
        formatMethodLabel(p.method),
        receiptNo != null ? formatReceiptNumber(receiptNo) : "",
      ]);
    }
  }
}

function formatDateKeyDisplay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return formatDate(new Date(Date.UTC(y, m - 1, d)));
}
