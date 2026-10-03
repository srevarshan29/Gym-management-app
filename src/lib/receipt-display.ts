export function formatReceiptNumber(number: number): string {
  return `RCPT-${String(number).padStart(4, "0")}`;
}

export const RECEIPT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

export function receiptMethodLabel(method: string): string {
  return RECEIPT_METHOD_LABEL[method] ?? method;
}

export function formatReceiptDisplayDate(value: Date | null): string {
  if (!value) return "\u2014";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function formatReceiptDisplayCurrency(value: number): string {
  return `Rs. ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
