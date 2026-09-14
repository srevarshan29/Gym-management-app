import { getRepositories, platformContext } from "@/lib/firestore";
import {
  VISITORS_PAGE_SIZE,
} from "@/lib/firestore/repositories/visitors";
import type { VisitorStatusFilter } from "@/lib/visitor-types";
import type {
  FitnessGoal,
  MemberGender,
  VisitorSource,
  VisitorStatus,
} from "@/lib/firestore/types";

export type { VisitorStatusFilter } from "@/lib/visitor-types";
export { VISITORS_PAGE_SIZE };

export type VisitorListItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: MemberGender | null;
  visitDate: Date;
  notes: string | null;
  status: VisitorStatus;
  source: VisitorSource;
};

export type VisitorsPageData = {
  visitors: VisitorListItem[];
  total: number;
  page: number;
  pageSize: number;
};

function toListItem(doc: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: MemberGender | null;
  visitDate: { toDate(): Date };
  notes: string | null;
  status: VisitorStatus;
  source: VisitorSource;
}): VisitorListItem {
  return {
    id: doc.id,
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    gender: doc.gender,
    visitDate: doc.visitDate.toDate(),
    notes: doc.notes,
    status: doc.status,
    source: doc.source,
  };
}

export async function getVisitorsPage(
  tenantGymId: string,
  options: {
    status?: VisitorStatusFilter;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<VisitorsPageData> {
  const { visitors } = getRepositories();
  const result = await visitors.listWalkInPage(platformContext, tenantGymId, {
    status: options.status ?? "pending",
    page: options.page,
    pageSize: options.pageSize ?? VISITORS_PAGE_SIZE,
  });

  return {
    visitors: result.items.map(toListItem),
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
}

/** @deprecated Use getVisitorsPage for paginated lists. */
export async function getVisitors(
  tenantGymId: string,
  status: VisitorStatusFilter = "pending",
): Promise<VisitorListItem[]> {
  const page = await getVisitorsPage(tenantGymId, { status, page: 1 });
  return page.visitors;
}

/** Pending walk-ins only — converted visitors are excluded from the KPI. */
export async function getVisitorCount(tenantGymId: string): Promise<number> {
  const { visitors } = getRepositories();
  return visitors.countByGym(platformContext, tenantGymId, {
    status: "pending",
    source: "walk_in",
  });
}

export async function getVisitorPrefill(
  tenantGymId: string,
  visitorId: string,
): Promise<{
  name: string;
  phone: string;
  email: string | null;
  gender: MemberGender | null;
  fitnessGoal: FitnessGoal | null;
  ageYears: number | null;
  heightCm: number | null;
  weightKg: number | null;
} | null> {
  const { visitors } = getRepositories();
  const doc = await visitors.getById(platformContext, tenantGymId, visitorId);
  if (!doc || doc.status !== "pending") return null;
  return {
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    gender: doc.gender,
    fitnessGoal: doc.fitnessGoal,
    ageYears: doc.ageYears,
    heightCm: doc.heightCm,
    weightKg: doc.weightKg,
  };
}
