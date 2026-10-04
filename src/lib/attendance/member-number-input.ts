import { formatMemberNumber } from "@/lib/receipt-display";

/** Parse front-desk input such as "72" or "#0072" into a numeric member number. */
export function parseMemberNumberInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function formatMemberNumberForMessage(memberNumber: number): string {
  return formatMemberNumber(memberNumber);
}
