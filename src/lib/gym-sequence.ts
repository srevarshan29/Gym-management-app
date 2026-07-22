import type { Prisma } from "@prisma/client";

/**
 * Atomically increments a per-gym counter (Gym.memberSeq / Gym.receiptSeq)
 * and returns the new value via a single UPDATE ... RETURNING, so concurrent
 * requests for the same gym never hand out the same sequential number.
 * Must be called inside the same transaction that creates the row using
 * the returned number, so a rollback also rolls back the counter bump.
 */
export async function nextMemberNumber(
  tx: Prisma.TransactionClient,
  gymId: string,
): Promise<number> {
  const rows = await tx.$queryRaw<{ memberSeq: number }[]>`
    UPDATE "Gym" SET "memberSeq" = "memberSeq" + 1, "updatedAt" = NOW()
    WHERE "id" = ${gymId}
    RETURNING "memberSeq"
  `;
  if (rows.length === 0) throw new Error("Gym not found.");
  return rows[0].memberSeq;
}

export async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  gymId: string,
): Promise<number> {
  const rows = await tx.$queryRaw<{ receiptSeq: number }[]>`
    UPDATE "Gym" SET "receiptSeq" = "receiptSeq" + 1, "updatedAt" = NOW()
    WHERE "id" = ${gymId}
    RETURNING "receiptSeq"
  `;
  if (rows.length === 0) throw new Error("Gym not found.");
  return rows[0].receiptSeq;
}
