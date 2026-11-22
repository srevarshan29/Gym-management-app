import {
  assertFinancialExportMatchesCounts,
  buildVerifiedFinancialArchivePayload,
} from "@/lib/gym-lifecycle/financial-archive-verify";
import { getFirestoreDb, getRepositories, platformContext } from "@/lib/firestore";

export async function prepareVerifiedFinancialArchive(gymId: string): Promise<void> {
  const db = getFirestoreDb();
  const { gyms, gymFinancialArchives } = getRepositories();
  const gym = await gyms.getById(platformContext, gymId);
  if (!gym) throw new Error("Gym not found.");

  const payload = await buildVerifiedFinancialArchivePayload(db, gymId);
  await assertFinancialExportMatchesCounts(db, gymId, payload);

  const retentionPolicyConfigured = Boolean(process.env.GYM_FINANCIAL_RETENTION_POLICY?.trim());
  const verifiedAt = new Date();

  await gymFinancialArchives.upsertArchive({
    gymId,
    gymName: gym.name,
    payments: payload.payments,
    receipts: payload.receipts,
    ledgerTransactions: payload.ledgerTransactions,
    subscriptions: payload.subscriptions,
    backupArtifactRef: gym.backupArtifactRef ?? null,
    retentionPolicyConfigured,
    financialArchiveStatus: "complete",
    financialArchiveVerifiedAt: verifiedAt,
  });
}