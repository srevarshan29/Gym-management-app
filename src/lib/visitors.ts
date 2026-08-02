import type { MemberGender, VisitorSource, VisitorStatus } from "@prisma/client";

import { withTenant } from "@/lib/db-context";

export type VisitorStatusFilter = "pending" | "converted" | "all";

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

export async function getVisitors(
  gymId: string,
  status: VisitorStatusFilter = "pending",
): Promise<VisitorListItem[]> {
  return withTenant(gymId, (tx) =>
    tx.visitor.findMany({
      where: {
        gymId,
        source: "walk_in",
        ...(status !== "all" ? { status } : {}),
      },
      orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        gender: true,
        visitDate: true,
        notes: true,
        status: true,
        source: true,
      },
    }),
  );
}

/** Pending walk-ins only — converted visitors are excluded from the KPI. */
export async function getVisitorCount(gymId: string): Promise<number> {
  return withTenant(gymId, (tx) =>
    tx.visitor.count({
      where: { gymId, status: "pending", source: "walk_in" },
    }),
  );
}
