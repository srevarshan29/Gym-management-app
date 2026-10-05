"use client";

import Link from "next/link";
import {
  CalendarCheck,
  CreditCard,
  RefreshCw,
  UserPlus,
} from "lucide-react";

import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { ReportPeriodDownloadButton } from "@/components/report-period-download-button";
import { ReportTablePreview } from "@/components/report-table-preview";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMemberNumber, RECEIPT_METHOD_LABEL } from "@/lib/receipt-display";
import type {
  OperationsReportDashboard,
  OperationsReportPaymentRow,
} from "@/lib/operations-reports/types";
import type { AttendanceListItem } from "@/lib/attendance/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type OperationsReportsDashboardProps = {
  data: OperationsReportDashboard;
  searchParams: Record<string, string | undefined>;
};

function paginationHref(
  base: Record<string, string | undefined>,
  key: "ap" | "pp",
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v) params.set(k, v);
  }
  if (page > 1) params.set(key, String(page));
  const q = params.toString();
  return q ? `/operations/reports?${q}` : "/operations/reports";
}

function formatDateKeyTable(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return formatDate(new Date(Date.UTC(y, m - 1, d)));
}

export function OperationsReportsDashboard({
  data,
  searchParams,
}: OperationsReportsDashboardProps) {
  const attendancePages = Math.max(
    1,
    Math.ceil(data.attendance.totalRows / data.attendance.pageSize),
  );
  const paymentPages = Math.max(
    1,
    Math.ceil(data.payments.totalRows / data.payments.pageSize),
  );

  return (
    <div className="space-y-4">
      <section
        aria-label="Report summary"
        className="grid min-w-0 auto-rows-fr gap-2 sm:grid-cols-2 xl:grid-cols-4"
      >
        <DashboardStatCard
          title="Attendance"
          value={data.summary.totalCheckIns.toLocaleString("en-IN")}
          hint="Check-ins in range"
          icon={<CalendarCheck className="h-5 w-5" />}
          tone="primary"
        />
        <DashboardStatCard
          title="Members"
          value={String(data.summary.newMembers)}
          hint="New members in range"
          icon={<UserPlus className="h-5 w-5" />}
          tone="green"
        />
        <DashboardStatCard
          title="Revenue"
          value={
            data.payments.canView
              ? formatCurrency(data.summary.totalRevenue)
              : "—"
          }
          hint={
            data.payments.canView
              ? "Collected payments"
              : "Owner-only financials"
          }
          icon={<CreditCard className="h-5 w-5" />}
          tone="primary"
        />
        <DashboardStatCard
          title="Renewals"
          value={String(data.summary.renewals)}
          hint="Subscription renewals"
          icon={<RefreshCw className="h-5 w-5" />}
          tone="amber"
        />
      </section>

      <ReportSection
        title="Attendance"
        description={`${data.attendance.summary.uniqueMembers.toLocaleString("en-IN")} unique · ${data.attendance.summary.averageCheckInsPerActiveMember.toFixed(1)} avg per member`}
        action={
          <SectionExports
            dataset="attendance"
            preset={data.range.preset}
            startDateKey={data.range.startDateKey}
            endDateKey={data.range.endDateKey}
          />
        }
        empty={
          data.attendance.empty
            ? "No attendance records for this date range."
            : null
        }
      >
        {!data.attendance.empty ? (
          <ReportTablePreview<AttendanceListItem>
            rows={data.attendance.rows}
            totalCount={data.attendance.totalRows}
            rowLabel="check-ins"
            renderTable={(visibleRows) => (
              <PreviewTable
                columns={["Date", "Member #", "Name", "Check-in", "Method"]}
                rows={visibleRows.length}
              >
                {visibleRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap py-2">
                      {formatDateKeyTable(row.dateKey)}
                    </TableCell>
                    <TableCell className="py-2">
                      {formatMemberNumber(row.memberNumber)}
                    </TableCell>
                    <TableCell className="py-2">{row.memberName}</TableCell>
                    <TableCell className="whitespace-nowrap py-2">
                      {formatDateTime(row.checkedInAt)}
                    </TableCell>
                    <TableCell className="py-2 capitalize">{row.method}</TableCell>
                  </TableRow>
                ))}
              </PreviewTable>
            )}
            footer={
              attendancePages > 1 ? (
                <TablePager
                  page={data.attendance.page}
                  totalPages={attendancePages}
                  prevHref={paginationHref(
                    searchParams,
                    "ap",
                    data.attendance.page - 1,
                  )}
                  nextHref={paginationHref(
                    searchParams,
                    "ap",
                    data.attendance.page + 1,
                  )}
                />
              ) : undefined
            }
          />
        ) : null}
      </ReportSection>

      <ReportSection
        title="Members"
        description={`${data.members.metrics.activeMembers} active · ${data.members.metrics.expiringDuringPeriod} expiring · ${data.members.metrics.renewalsDuringPeriod} renewals`}
        action={
          <SectionExports
            dataset="members"
            preset={data.range.preset}
            startDateKey={data.range.startDateKey}
            endDateKey={data.range.endDateKey}
          />
        }
        empty={
          data.members.empty
            ? "No new members registered in this date range."
            : null
        }
      >
        {!data.members.empty ? (
          <ReportTablePreview
            rows={data.members.rows}
            totalCount={data.members.rows.length}
            rowLabel="members"
            renderTable={(visibleRows) => (
              <PreviewTable
                columns={["Member #", "Name", "Registered", "Package", "Status"]}
                rows={visibleRows.length}
              >
                {visibleRows.map((row) => (
                  <TableRow
                    key={`${row.memberNumber}-${row.registeredAt.toISOString()}`}
                  >
                    <TableCell className="py-2">
                      {formatMemberNumber(row.memberNumber)}
                    </TableCell>
                    <TableCell className="py-2">{row.name}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      {formatDate(row.registeredAt)}
                    </TableCell>
                    <TableCell className="py-2">{row.packageName ?? "—"}</TableCell>
                    <TableCell className="py-2">{row.statusLabel}</TableCell>
                  </TableRow>
                ))}
              </PreviewTable>
            )}
          />
        ) : null}
      </ReportSection>

      <ReportSection
        title="Payments & revenue"
        description={
          data.payments.canView
            ? `${data.payments.metrics.paymentCount} payments · avg ${formatCurrency(data.payments.metrics.averagePayment)}`
            : "Payment totals are visible to gym owners only."
        }
        action={
          <SectionExports
            dataset="payments"
            preset={data.range.preset}
            startDateKey={data.range.startDateKey}
            endDateKey={data.range.endDateKey}
            disabled={!data.payments.canView}
          />
        }
        empty={
          data.payments.canView && data.payments.empty
            ? "No payments recorded for this date range."
            : null
        }
      >
        {data.payments.canView && !data.payments.empty ? (
          <>
            {data.payments.metrics.byMethod.length > 0 ? (
              <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {data.payments.metrics.byMethod.map((row) => (
                  <li key={row.method}>
                    <span className="font-medium text-foreground">
                      {RECEIPT_METHOD_LABEL[row.method] ?? row.method}
                    </span>
                    {": "}
                    {formatCurrency(row.total)} ({row.count})
                  </li>
                ))}
              </ul>
            ) : null}
            <ReportTablePreview<OperationsReportPaymentRow>
              rows={data.payments.rows}
              totalCount={data.payments.totalRows}
              rowLabel="payments"
              renderTable={(visibleRows) => (
                <PreviewTable
                  columns={["Date", "Member #", "Name", "Amount", "Method", "Receipt"]}
                  rows={visibleRows.length}
                >
                  {visibleRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="py-2 whitespace-nowrap">
                        {formatDate(row.paidAt)}
                      </TableCell>
                      <TableCell className="py-2">
                        {formatMemberNumber(row.memberNumber)}
                      </TableCell>
                      <TableCell className="py-2">{row.memberName}</TableCell>
                      <TableCell className="py-2">{formatCurrency(row.amount)}</TableCell>
                      <TableCell className="py-2">
                        {RECEIPT_METHOD_LABEL[row.method] ?? row.method}
                      </TableCell>
                      <TableCell className="py-2">{row.receiptNumber || "—"}</TableCell>
                    </TableRow>
                  ))}
                </PreviewTable>
              )}
              footer={
                paymentPages > 1 ? (
                  <TablePager
                    page={data.payments.page}
                    totalPages={paymentPages}
                    prevHref={paginationHref(
                      searchParams,
                      "pp",
                      data.payments.page - 1,
                    )}
                    nextHref={paginationHref(
                      searchParams,
                      "pp",
                      data.payments.page + 1,
                    )}
                  />
                ) : undefined
              }
            />
          </>
        ) : null}
      </ReportSection>

      <ReportSection
        title="Subscriptions"
        description={`${data.subscriptions.metrics.newSubscriptions} new · ${data.subscriptions.metrics.renewedSubscriptions} renewed · ${data.subscriptions.metrics.activeMemberships} active · ${data.subscriptions.metrics.expiredMemberships} expired`}
        action={
          <SectionExports
            dataset="subscriptions"
            preset={data.range.preset}
            startDateKey={data.range.startDateKey}
            endDateKey={data.range.endDateKey}
          />
        }
        empty={
          data.subscriptions.empty
            ? "No subscription activity in this date range."
            : null
        }
      >
        {!data.subscriptions.empty ? (
          <ReportTablePreview
            rows={data.subscriptions.rows}
            totalCount={data.subscriptions.rows.length}
            rowLabel="subscriptions"
            renderTable={(visibleRows) => (
              <PreviewTable
                columns={["Member #", "Name", "Package", "Type", "Start", "End"]}
                rows={visibleRows.length}
              >
                {visibleRows.map((row) => (
                  <TableRow
                    key={`${row.memberNumber}-${row.createdAt.toISOString()}-${row.packageName}`}
                  >
                    <TableCell className="py-2">
                      {formatMemberNumber(row.memberNumber)}
                    </TableCell>
                    <TableCell className="py-2">{row.memberName}</TableCell>
                    <TableCell className="py-2">{row.packageName}</TableCell>
                    <TableCell className="py-2">{row.kind}</TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      {formatDate(row.startDate)}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">
                      {formatDate(row.endDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </PreviewTable>
            )}
          />
        ) : null}
      </ReportSection>
    </div>
  );
}

function SectionExports(
  props: React.ComponentProps<typeof ReportPeriodDownloadButton>,
) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <ReportPeriodDownloadButton {...props} />
      <ReportPeriodDownloadButton {...props} format="pdf" />
    </div>
  );
}

function PreviewTable({
  columns,
  rows,
  children,
}: {
  columns: string[];
  rows: number;
  children: React.ReactNode;
}) {
  if (rows === 0) return null;
  return (
    <div className="-mx-1 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead key={col} className="h-8 text-xs">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

function ReportSection({
  title,
  description,
  action,
  children,
  empty,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
  children: React.ReactNode;
  empty: string | null;
}) {
  return (
    <section className="rounded-lg border border-border/40 bg-card/80 px-3 py-3 sm:px-4">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      {empty ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        children
      )}
    </section>
  );
}

function TablePager({
  page,
  totalPages,
  prevHref,
  nextHref,
}: {
  page: number;
  totalPages: number;
  prevHref: string;
  nextHref: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">
        Page {page}/{totalPages}
      </span>
      {page > 1 ? (
        <Button asChild size="sm" variant="outline" className="h-7 px-2">
          <Link href={prevHref}>Prev</Link>
        </Button>
      ) : null}
      {page < totalPages ? (
        <Button asChild size="sm" variant="outline" className="h-7 px-2">
          <Link href={nextHref}>Next</Link>
        </Button>
      ) : null}
    </div>
  );
}
