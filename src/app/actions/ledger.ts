"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canManageLedger } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const ledgerFieldsSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"], {
    errorMap: () => ({ message: "Select income or expense." }),
  }),
  category: z.string().trim().min(1, "Category is required").max(120),
  amount: z.string().trim().min(1, "Amount is required"),
  occurredOn: z.string().trim().min(1, "Date is required"),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

function parseOccurredOn(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function parseAmount(value: string): Prisma.Decimal | null {
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return null;
  return new Prisma.Decimal(num);
}

function revalidateAccountsPath() {
  revalidatePath("/finance/accounts");
}

export async function createLedgerTransaction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageLedger(user.role)) {
    return actionError("You do not have permission to manage accounts.");
  }

  const parsed = ledgerFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const occurredOn = parseOccurredOn(parsed.data.occurredOn);
  if (!occurredOn) {
    return actionError("Invalid date.");
  }

  const amount = parseAmount(parsed.data.amount);
  if (!amount) {
    return actionError("Enter a valid amount greater than zero.");
  }

  await withTenant(user.gymId, (tx) =>
    tx.ledgerTransaction.create({
      data: {
        gymId: user.gymId,
        type: parsed.data.type,
        category: parsed.data.category,
        amount,
        occurredOn,
        note: parsed.data.note || null,
        createdById: user.id,
      },
    }),
  );

  revalidateAccountsPath();
  return actionOk("Transaction logged.");
}

export async function updateLedgerTransaction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageLedger(user.role)) {
    return actionError("You do not have permission to manage accounts.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing transaction id.");

  const parsed = ledgerFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const occurredOn = parseOccurredOn(parsed.data.occurredOn);
  if (!occurredOn) {
    return actionError("Invalid date.");
  }

  const amount = parseAmount(parsed.data.amount);
  if (!amount) {
    return actionError("Enter a valid amount greater than zero.");
  }

  const result = await withTenant(user.gymId, (tx) =>
    tx.ledgerTransaction.updateMany({
      where: { id, gymId: user.gymId },
      data: {
        type: parsed.data.type,
        category: parsed.data.category,
        amount,
        occurredOn,
        note: parsed.data.note || null,
      },
    }),
  );
  if (result.count === 0) {
    return actionError("Transaction not found.");
  }

  revalidateAccountsPath();
  return actionOk("Transaction updated.");
}

export async function deleteLedgerTransaction(id: string): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageLedger(user.role)) {
    return actionError("You do not have permission to manage accounts.");
  }
  if (!id) return actionError("Missing transaction id.");

  const result = await withTenant(user.gymId, (tx) =>
    tx.ledgerTransaction.deleteMany({ where: { id, gymId: user.gymId } }),
  );
  if (result.count === 0) {
    return actionError("Transaction not found.");
  }

  revalidateAccountsPath();
  return actionOk("Transaction removed.");
}
