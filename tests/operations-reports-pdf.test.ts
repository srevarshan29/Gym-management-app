import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveCustomRange } from "@/lib/operations-reports/date-range";
import {
  buildSummaryLinesForDataset,
  createOperationsReportPdfDownload,
  operationsReportPdfFilename,
  reportTitleForDataset,
} from "@/lib/operations-reports/pdf-export";

vi.mock("@/lib/operations-reports/render-operations-report-pdf", () => ({
  renderOperationsReportPdfBuffer: async () => Buffer.from("%PDF-1.4 mock"),
}));

const mockLoadDashboard = vi.fn();

vi.mock("@/lib/gym-profile", () => ({
  getGymProfilePlatform: vi.fn(async () => ({ name: "Iron Gym" })),
}));

vi.mock("@/lib/operations-reports/queries", () => ({
  loadOperationsReportDashboard: (...args: unknown[]) => mockLoadDashboard(...args),
}));

function emptyDashboard() {
  const range = resolveCustomRange("2026-09-01", "2026-09-30");
  return {
    range,
    rangeLabel: "1 Sep 2026 – 30 Sep 2026",
    summary: { totalCheckIns: 0, newMembers: 0, totalRevenue: 0, renewals: 0 },
    attendance: {
      summary: {
        totalCheckIns: 0,
        uniqueMembers: 0,
        averageCheckInsPerActiveMember: 0,
      },
      rows: [],
      totalRows: 0,
      page: 1,
      pageSize: 50,
      empty: true,
    },
    members: {
      metrics: {
        newMembers: 0,
        activeMembers: 0,
        expiringDuringPeriod: 0,
        renewalsDuringPeriod: 0,
      },
      rows: [],
      empty: true,
    },
    payments: {
      metrics: {
        totalCollected: 0,
        paymentCount: 0,
        averagePayment: 0,
        byMethod: [],
      },
      rows: [],
      totalRows: 0,
      page: 1,
      pageSize: 50,
      canView: true,
      empty: true,
    },
    subscriptions: {
      metrics: {
        newSubscriptions: 0,
        renewedSubscriptions: 0,
        activeMemberships: 0,
        expiredMemberships: 0,
      },
      rows: [],
      empty: true,
    },
  };
}

describe("operations report PDF export", () => {
  beforeEach(() => {
    mockLoadDashboard.mockReset();
    mockLoadDashboard.mockImplementation(async () => emptyDashboard());
  });

  it("builds a clear PDF filename from dataset and date range", () => {
    const range = resolveCustomRange("2026-09-01", "2026-09-30");
    expect(operationsReportPdfFilename("attendance", range)).toBe(
      "attendance-report-2026-09-01-to-2026-09-30.pdf",
    );
    expect(operationsReportPdfFilename("payments", range)).toBe(
      "payments-revenue-report-2026-09-01-to-2026-09-30.pdf",
    );
  });

  it("uses expected report titles per dataset", () => {
    expect(reportTitleForDataset("attendance")).toBe("Attendance Report");
    expect(reportTitleForDataset("payments")).toBe("Payments & Revenue Report");
  });

  it("passes resolved date range and gym id into dashboard load", async () => {
    const result = await createOperationsReportPdfDownload("gym-a", "OWNER", {
      dataset: "members",
      preset: "custom",
      start: "2026-09-01",
      end: "2026-09-30",
    });

    expect(result.ok).toBe(true);
    expect(mockLoadDashboard).toHaveBeenCalledWith(
      "gym-a",
      expect.objectContaining({
        startDateKey: "2026-09-01",
        endDateKey: "2026-09-30",
      }),
      expect.objectContaining({ canViewFinancials: true }),
    );
  });

  it("returns PDF bytes and attachment filename on success", async () => {
    const result = await createOperationsReportPdfDownload("gym-a", "OWNER", {
      dataset: "members",
      preset: "last_month",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.buffer.toString()).toContain("%PDF");
      expect(result.filename).toMatch(/members-report-.*\.pdf$/);
    }
  });

  it("rejects payments PDF for non-owner roles", async () => {
    const result = await createOperationsReportPdfDownload("gym-a", "STAFF", {
      dataset: "payments",
      preset: "last_month",
    });
    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden." });
  });

  it("handles empty report payload gracefully in summary builder", () => {
    const range = resolveCustomRange("2026-09-01", "2026-09-30");
    const lines = buildSummaryLinesForDataset("attendance", emptyDashboard());
    expect(lines[0]).toContain("Total check-ins: 0");
  });
});
