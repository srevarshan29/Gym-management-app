/** Shared GymDesk receipt design tokens (HTML + PDF). Client-safe. */

export const RECEIPT_DESIGN = {
  accent: "#B6FF00",
  accentSoft: "#F3FFD6",
  border: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  background: "#FFFFFF",
} as const;

export const RECEIPT_COPY = {
  documentTitle: "PAYMENT RECEIPT",
  billedTo: "BILLED TO",
  paymentDetails: "PAYMENT DETAILS",
  amountPaid: "AMOUNT PAID",
  installmentSummary: "INSTALLMENT SUMMARY",
  footerThanks: "Thank you for your payment.",
  footerLegal:
    "This is a computer-generated receipt and does not require a signature.",
} as const;

export const RECEIPT_FIELD_LABELS = {
  memberName: "Member Name",
  phoneNumber: "Phone Number",
  memberId: "Member ID",
  package: "Package / Subscription",
  paymentMethod: "Payment Method",
  subscriptionValidity: "Subscription Validity",
  totalOwed: "TOTAL OWED",
  balanceRemaining: "BALANCE REMAINING",
  generalPayment: "General payment",
} as const;

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
  return `\u20B9${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
