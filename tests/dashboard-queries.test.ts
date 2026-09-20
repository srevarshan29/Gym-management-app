import { describe, expect, it } from "vitest";

import {
  computeCurrentCycleCollection,
  computeDashboardStatusCounts,
  computeMemberSparklines,
  computePackageDistribution,
  statusCutoffs,
  type WeekBucket,
} from "@/lib/dashboard-queries";
import type { MemberListItem } from "@/lib/queries";
import { statusFromEndDate } from "@/lib/subscription";

function member(
  overrides: Partial<MemberListItem> & Pick<MemberListItem, "id">,
): MemberListItem {
  return {
    memberNumber: 1,
    name: "Test",
    phone: "999",
    photoUrl: null,
    gender: "MALE",
    createdAt: new Date("2026-01-01"),
    packageName: "Monthly",
    currentSubscriptionId: null,
    startDate: null,
    endDate: null,
    status: "NONE",
    subsAmount: null,
    paidAmount: null,
    pendingAmount: 0,
    addedByName: null,
    isPt: false,
    trainerId: null,
    trainerName: null,
    ...overrides,
  };
}

describe("dashboard compute helpers", () => {
  const now = new Date("2026-09-14T12:00:00");
  const cutoffs = statusCutoffs(now);

  it("computeDashboardStatusCounts matches prior loop semantics", () => {
    const activeEnd = new Date(now);
    activeEnd.setDate(activeEnd.getDate() + 30);
    const expiringEnd = new Date(now);
    expiringEnd.setDate(expiringEnd.getDate() + 3);
    const expiredEnd = new Date(now);
    expiredEnd.setDate(expiredEnd.getDate() - 2);

    const all = [
      member({
        id: "a",
        endDate: activeEnd,
        status: statusFromEndDate(activeEnd, now),
      }),
      member({
        id: "b",
        endDate: expiringEnd,
        status: statusFromEndDate(expiringEnd, now),
      }),
      member({
        id: "c",
        endDate: expiredEnd,
        status: statusFromEndDate(expiredEnd, now),
      }),
      member({ id: "d", endDate: null, status: "NONE" }),
    ];

    const result = computeDashboardStatusCounts(4, all, cutoffs);
    expect(result.totalMembers).toBe(4);
    expect(result.activeOrExpiringCount).toBe(2);
    expect(result.expiringSoonCount).toBe(1);
    expect(result.expiredCount).toBe(1);
  });

  it("computeCurrentCycleCollection matches per-id subscription lookup", () => {
    const all = [
      member({ id: "m1", currentSubscriptionId: "s1" }),
      member({ id: "m2", currentSubscriptionId: "s2" }),
      member({ id: "m3", currentSubscriptionId: null }),
      member({ id: "m4", currentSubscriptionId: "missing" }),
    ];

    const subs = new Map([
      ["s1", { priceAtPurchase: 1000, paidTotal: 600 }],
      ["s2", { priceAtPurchase: 2000, paidTotal: 2000 }],
    ]);

    const batch = computeCurrentCycleCollection(all, subs);

    let expectedExpected = 0;
    let expectedCollected = 0;
    for (const m of all) {
      if (!m.currentSubscriptionId) continue;
      const sub = subs.get(m.currentSubscriptionId);
      if (!sub) continue;
      expectedExpected += sub.priceAtPurchase;
      expectedCollected += sub.paidTotal;
    }

    expect(batch).toEqual({
      collectionExpected: expectedExpected,
      collectionCollected: expectedCollected,
    });
  });

  it("computePackageDistribution counts active packages only", () => {
    const activeEnd = new Date(now);
    activeEnd.setDate(activeEnd.getDate() + 10);
    const expiredEnd = new Date(now);
    expiredEnd.setDate(expiredEnd.getDate() - 1);

    const all = [
      member({ id: "1", packageName: "Gold", endDate: activeEnd }),
      member({ id: "2", packageName: "Gold", endDate: activeEnd }),
      member({ id: "3", packageName: null, endDate: activeEnd }),
      member({ id: "4", packageName: "Silver", endDate: expiredEnd }),
    ];

    expect(computePackageDistribution(all, cutoffs)).toEqual([
      { name: "Gold", count: 2 },
      { name: "No package", count: 1 },
    ]);
  });

  it("computeMemberSparklines bucket counts stay stable", () => {
    const buckets: WeekBucket[] = [
      {
        start: new Date("2026-09-01T00:00:00"),
        end: new Date("2026-09-07T23:59:59.999"),
      },
    ];
    const endDate = new Date("2026-09-10T12:00:00");
    const all = [
      member({
        id: "1",
        createdAt: new Date("2026-09-03"),
        endDate,
        status: statusFromEndDate(endDate, now),
      }),
    ];

    const rows = computeMemberSparklines(all, buckets, now);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.newCount).toBe(1);
    expect(rows[0]?.activeCount).toBe(1);
  });
});
