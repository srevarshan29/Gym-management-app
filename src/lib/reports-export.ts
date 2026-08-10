import type { Role } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import { rowsToCsv } from "@/lib/csv";
import { getDietPlansPageData } from "@/lib/diet-plans";
import { getEmployees } from "@/lib/employees";
import { getEvents } from "@/lib/events";
import { getPtMembersPageData } from "@/lib/pt-members";
import {
  canExportReports,
  canViewFinancials,
} from "@/lib/permissions";
import { getMembersWithStatus } from "@/lib/queries";
import { getWorkoutPlansPageData } from "@/lib/workout-plans";
import { formatCurrency, formatDate } from "@/lib/utils";

export const REPORT_MODULE_IDS = [
  "members",
  "payments",
  "employees",
  "visitors",
  "events",
  "diet-plans",
  "workout-plans",
  "pt-members",
] as const;

export type ReportModuleId = (typeof REPORT_MODULE_IDS)[number];

export type ReportModuleMeta = {
  id: ReportModuleId;
  title: string;
  description: string;
  ownerOnly: boolean;
};

export const REPORT_MODULES: ReportModuleMeta[] = [
  {
    id: "members",
    title: "Members",
    description: "Member roster with package, status, and balances.",
    ownerOnly: false,
  },
  {
    id: "payments",
    title: "Payments",
    description: "Full payment history for this gym.",
    ownerOnly: true,
  },
  {
    id: "employees",
    title: "Employees",
    description: "HR employee records.",
    ownerOnly: false,
  },
  {
    id: "visitors",
    title: "Visitors",
    description: "All walk-ins and QR visitors.",
    ownerOnly: false,
  },
  {
    id: "events",
    title: "Events",
    description: "Scheduled gym events and activities.",
    ownerOnly: false,
  },
  {
    id: "diet-plans",
    title: "Diet plans",
    description: "Assigned nutrition programmes.",
    ownerOnly: false,
  },
  {
    id: "workout-plans",
    title: "Workout plans",
    description: "Assigned training programmes.",
    ownerOnly: false,
  },
  {
    id: "pt-members",
    title: "PT members",
    description: "Personal training clients and trainers.",
    ownerOnly: false,
  },
];

export type ReportModuleCounts = Record<ReportModuleId, number>;

export function isReportModuleId(value: string): value is ReportModuleId {
  return (REPORT_MODULE_IDS as readonly string[]).includes(value);
}

export function canDownloadReportModule(
  role: Role,
  moduleId: ReportModuleId,
): boolean {
  if (!canExportReports(role)) return false;
  const meta = REPORT_MODULES.find((m) => m.id === moduleId);
  if (!meta) return false;
  if (meta.ownerOnly && !canViewFinancials(role)) return false;
  return true;
}

export function visibleReportModules(role: Role): ReportModuleMeta[] {
  if (!canExportReports(role)) return [];
  return REPORT_MODULES.filter(
    (m) => !m.ownerOnly || canViewFinancials(role),
  );
}

export async function getReportModuleCounts(
  gymId: string,
): Promise<ReportModuleCounts> {
  const [
    memberCount,
    paymentCount,
    employeeCount,
    visitorCount,
    eventCount,
    dietPlanCount,
    workoutPlanCount,
    ptMemberCount,
  ] = await withTenant(gymId, (tx) =>
    Promise.all([
      tx.member.count({ where: { gymId } }),
      tx.payment.count({ where: { gymId } }),
      tx.employee.count({ where: { gymId } }),
      tx.visitor.count({ where: { gymId } }),
      tx.gymEvent.count({ where: { gymId } }),
      tx.dietPlan.count({ where: { gymId } }),
      tx.workoutPlan.count({ where: { gymId } }),
      tx.member.count({ where: { gymId, isPt: true } }),
    ]),
  );

  return {
    members: memberCount,
    payments: paymentCount,
    employees: employeeCount,
    visitors: visitorCount,
    events: eventCount,
    "diet-plans": dietPlanCount,
    "workout-plans": workoutPlanCount,
    "pt-members": ptMemberCount,
  };
}

function formatPaymentMethod(method: string): string {
  return method.replace(/_/g, " ");
}

export async function buildReportCsv(
  gymId: string,
  moduleId: ReportModuleId,
): Promise<{ filename: string; body: string }> {
  const stamp = new Date().toISOString().slice(0, 10);

  switch (moduleId) {
    case "members": {
      const members = await getMembersWithStatus(gymId);
      const headers = [
        "Member #",
        "Name",
        "Phone",
        "Package",
        "Status",
        "Start date",
        "Expiry",
        "Pending",
        "PT",
        "Trainer",
        "Added by",
      ];
      const rows = members.map((m) => [
        String(m.memberNumber).padStart(4, "0"),
        m.name,
        m.phone,
        m.packageName ?? "",
        m.status,
        m.startDate ? formatDate(m.startDate) : "",
        m.endDate ? formatDate(m.endDate) : "",
        m.pendingAmount > 0 ? formatCurrency(m.pendingAmount) : "",
        m.isPt ? "Yes" : "No",
        m.trainerName ?? "",
        m.addedByName ?? "",
      ]);
      return {
        filename: `members-${stamp}.csv`,
        body: rowsToCsv(headers, rows),
      };
    }
    case "payments": {
      const payments = await withTenant(gymId, (tx) =>
        tx.payment.findMany({
          where: { gymId },
          orderBy: { paidAt: "desc" },
          include: {
            member: { select: { name: true } },
            subscription: { include: { package: { select: { name: true } } } },
            recordedBy: { select: { name: true } },
          },
        }),
      );
      const headers = [
        "Paid date",
        "Member",
        "Package",
        "Amount",
        "Method",
        "Recorded by",
      ];
      const rows = payments.map((p) => [
        formatDate(p.paidAt),
        p.member.name,
        p.subscription?.package.name ?? "",
        formatCurrency(Number(p.amount)),
        formatPaymentMethod(p.method),
        p.recordedBy?.name ?? "",
      ]);
      return {
        filename: `payments-${stamp}.csv`,
        body: rowsToCsv(headers, rows),
      };
    }
    case "employees": {
      const employees = await getEmployees(gymId);
      const headers = [
        "Name",
        "Phone",
        "Position",
        "Joining date",
        "Salary",
        "Notes",
      ];
      const rows = employees.map((e) => [
        e.name,
        e.phone,
        e.position,
        formatDate(e.joiningDate),
        e.salary != null ? formatCurrency(e.salary) : "",
        e.notes ?? "",
      ]);
      return {
        filename: `employees-${stamp}.csv`,
        body: rowsToCsv(headers, rows),
      };
    }
    case "visitors": {
      const visitors = await withTenant(gymId, (tx) =>
        tx.visitor.findMany({
          where: { gymId },
          orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
          select: {
            name: true,
            phone: true,
            visitDate: true,
            status: true,
            source: true,
            notes: true,
          },
        }),
      );
      const headers = ["Name", "Phone", "Visit date", "Status", "Source", "Notes"];
      const rows = visitors.map((v) => [
        v.name,
        v.phone,
        formatDate(v.visitDate),
        v.status,
        v.source.replace(/_/g, " "),
        v.notes ?? "",
      ]);
      return {
        filename: `visitors-${stamp}.csv`,
        body: rowsToCsv(headers, rows),
      };
    }
    case "events": {
      const events = await getEvents(gymId);
      const headers = ["Title", "Date", "Location", "Description"];
      const rows = events.map((e) => [
        e.title,
        formatDate(e.eventDate),
        e.location,
        e.description ?? "",
      ]);
      return {
        filename: `events-${stamp}.csv`,
        body: rowsToCsv(headers, rows),
      };
    }
    case "diet-plans": {
      const { plans } = await getDietPlansPageData(gymId);
      const headers = ["Member", "Title", "Calories per day", "Meal plan"];
      const rows = plans.map((p) => [
        p.memberName,
        p.title,
        String(p.caloriesPerDay),
        p.mealPlan,
      ]);
      return {
        filename: `diet-plans-${stamp}.csv`,
        body: rowsToCsv(headers, rows),
      };
    }
    case "workout-plans": {
      const { plans } = await getWorkoutPlansPageData(gymId);
      const headers = ["Member", "Title", "Duration (weeks)", "Focus goal", "Exercises", "Legacy"];
      const rows = plans.map((p) => [
        p.memberName,
        p.title,
        p.durationWeeks ?? "",
        p.focusGoal ?? "",
        p.isLegacy ? "" : p.exerciseCount,
        p.isLegacy ? "Yes" : "No",
      ]);
      return {
        filename: `workout-plans-${stamp}.csv`,
        body: rowsToCsv(headers, rows),
      };
    }
    case "pt-members": {
      const data = await getPtMembersPageData(gymId);
      const headers = ["Member #", "Name", "Phone", "Package", "Trainer"];
      const rows: (string | number)[][] = [];
      for (const group of data.groups) {
        for (const m of group.members) {
          rows.push([
            String(m.memberNumber).padStart(4, "0"),
            m.name,
            m.phone,
            m.packageName ?? "",
            m.trainerName ?? group.trainerName,
          ]);
        }
      }
      rows.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
      return {
        filename: `pt-members-${stamp}.csv`,
        body: rowsToCsv(headers, rows),
      };
    }
    default: {
      const _exhaustive: never = moduleId;
      throw new Error(`Unknown report module: ${_exhaustive}`);
    }
  }
}
