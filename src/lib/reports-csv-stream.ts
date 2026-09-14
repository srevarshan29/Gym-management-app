import { getRepositories, platformContext } from "@/lib/firestore";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { getFirestoreDb } from "@/lib/firebase/admin";
import type { UserDoc } from "@/lib/firestore/types";
import { csvDataLine } from "@/lib/csv";
import { statusFromEndDate } from "@/lib/subscription";
import { formatCurrency, formatDate } from "@/lib/utils";

const EXPORT_BATCH_SIZE = 200;

export const MEMBER_CSV_HEADERS = [
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
] as const;

export const PAYMENT_CSV_HEADERS = [
  "Paid date",
  "Member",
  "Package",
  "Amount",
  "Method",
  "Recorded by",
] as const;

function formatPaymentMethod(method: string): string {
  return method.replace(/_/g, " ");
}

async function* iterateMemberExportRows(tenantGymId: string) {
  const { members } = getRepositories();
  const ctx = platformContext;
  const db = getFirestoreDb();
  const trainerCache = new Map<string, string>();
  let startAfterId: string | null = null;

  async function trainerName(trainerId: string | null): Promise<string> {
    if (!trainerId) return "";
    const cached = trainerCache.get(trainerId);
    if (cached !== undefined) return cached;
    const snap = await db.collection(COLLECTIONS.users).doc(trainerId).get();
    const name = snap.exists ? (snap.data() as UserDoc).name : "";
    trainerCache.set(trainerId, name);
    return name;
  }

  for (;;) {
    const batch = await members.listExportBatch(ctx, tenantGymId, {
      limit: EXPORT_BATCH_SIZE,
      startAfterId,
    });
    if (batch.rows.length === 0) return;

    for (const member of batch.rows) {
      yield csvDataLine([
        String(member.memberNumber).padStart(4, "0"),
        member.name,
        member.phone,
        member.currentPackageName ?? "",
        statusFromEndDate(member.currentEndDate?.toDate()),
        member.currentStartDate ? formatDate(member.currentStartDate.toDate()) : "",
        member.currentEndDate ? formatDate(member.currentEndDate.toDate()) : "",
        member.pendingAmountTotal > 0
          ? formatCurrency(member.pendingAmountTotal)
          : "",
        member.isPt ? "Yes" : "No",
        await trainerName(member.trainerId),
        member.addedByName ?? "",
      ]);
    }

    if (!batch.nextCursor) return;
    startAfterId = batch.nextCursor;
  }
}

async function* iteratePaymentExportRows(tenantGymId: string) {
  const { payments } = getRepositories();
  const ctx = platformContext;
  let startAfterId: string | null = null;

  for (;;) {
    const batch = await payments.listExportBatch(ctx, tenantGymId, {
      limit: EXPORT_BATCH_SIZE,
      startAfterId,
    });
    if (batch.rows.length === 0) return;

    const mapped = await payments.mapExportRows(batch.rows);
    for (const payment of mapped) {
      yield csvDataLine([
        formatDate(payment.paidAt),
        payment.member.name,
        payment.subscription?.package.name ?? "",
        formatCurrency(Number(payment.amount)),
        formatPaymentMethod(payment.method),
        payment.recordedBy?.name ?? "",
      ]);
    }

    if (!batch.nextCursor) return;
    startAfterId = batch.nextCursor;
  }
}

export function iterateReportCsvChunks(
  tenantGymId: string,
  moduleId: "members" | "payments",
): AsyncGenerator<string, void, unknown> {
  return moduleId === "members"
    ? iterateMemberExportRows(tenantGymId)
    : iteratePaymentExportRows(tenantGymId);
}
