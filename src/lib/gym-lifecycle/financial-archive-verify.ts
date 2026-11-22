import type { Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import { exportGymFinancialRecords } from "@/lib/gym-lifecycle/financial-export";
import type { GymFinancialArchiveDoc } from "@/lib/firestore/repositories/gym-financial-archives";

export type FinancialArchiveCompleteness = {
  payments: boolean;
  receipts: boolean;
  ledgerTransactions: boolean;
  subscriptions: boolean;
};

export const REQUIRED_FINANCIAL_EXPORTS: (keyof FinancialArchiveCompleteness)[] = [
  "payments",
  "receipts",
  "ledgerTransactions",
  "subscriptions",
];

export function evaluateFinancialArchiveCompleteness(
  archive: Pick<
    GymFinancialArchiveDoc,
    | "payments"
    | "receipts"
    | "ledgerTransactions"
    | "subscriptions"
    | "financialArchiveStatus"
    | "retentionPolicyConfigured"
  > | null,
): { ok: true } | { ok: false; reason: string; missing: string[] } {
  if (!archive) {
    return { ok: false, reason: "Financial archive does not exist.", missing: ["archive"] };
  }

  const missing: string[] = [];
  if (!Array.isArray(archive.payments)) missing.push("payments");
  if (!Array.isArray(archive.receipts)) missing.push("receipts");
  if (!Array.isArray(archive.ledgerTransactions)) missing.push("ledgerTransactions");
  if (!Array.isArray(archive.subscriptions)) missing.push("subscriptions");

  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Financial archive is missing required exports: ${missing.join(", ")}.`,
      missing,
    };
  }

  if (archive.financialArchiveStatus !== "complete") {
    return {
      ok: false,
      reason: "Financial archive has not been verified complete.",
      missing: ["verification"],
    };
  }

  if (!archive.retentionPolicyConfigured) {
    return {
      ok: false,
      reason:
        "Financial retention policy is not configured. Set GYM_FINANCIAL_RETENTION_POLICY to an explicit operator retention decision before purge.",
      missing: ["retention_policy"],
    };
  }

  return { ok: true };
}

export async function buildVerifiedFinancialArchivePayload(
  db: Firestore,
  gymId: string,
): Promise<{
  payments: unknown[];
  receipts: unknown[];
  ledgerTransactions: unknown[];
  subscriptions: unknown[];
  completeness: FinancialArchiveCompleteness;
}> {
  const exported = await exportGymFinancialRecords(db, gymId);
  const completeness: FinancialArchiveCompleteness = {
    payments: Array.isArray(exported.payments),
    receipts: Array.isArray(exported.receipts),
    ledgerTransactions: Array.isArray(exported.ledgerTransactions),
    subscriptions: Array.isArray(exported.subscriptions),
  };

  for (const key of REQUIRED_FINANCIAL_EXPORTS) {
    if (!completeness[key]) {
      throw new Error(`Financial export failed for ${key}.`);
    }
  }

  return {
    payments: exported.payments,
    receipts: exported.receipts,
    ledgerTransactions: exported.ledgerTransactions,
    subscriptions: exported.subscriptions,
    completeness,
  };
}

/** Lightweight count sanity check — optional hard fail if export is empty but counts > 0. */
export async function assertFinancialExportMatchesCounts(
  db: Firestore,
  gymId: string,
  exported: {
    payments: unknown[];
    receipts: unknown[];
    ledgerTransactions: unknown[];
    subscriptions: unknown[];
  },
): Promise<void> {
  const collections = [
    { name: COLLECTIONS.payments, rows: exported.payments },
    { name: COLLECTIONS.receipts, rows: exported.receipts },
    { name: COLLECTIONS.ledgerTransactions, rows: exported.ledgerTransactions },
    { name: COLLECTIONS.subscriptions, rows: exported.subscriptions },
  ] as const;

  for (const { name, rows } of collections) {
    const snap = await db.collection(name).where("gymId", "==", gymId).count().get();
    const expected = snap.data().count;
    if (expected > 0 && rows.length === 0) {
      throw new Error(
        `Financial export for ${name} is empty but inventory reports ${expected} documents.`,
      );
    }
  }
}