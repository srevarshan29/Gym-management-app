import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

import { formatReceiptNumber, type ReceiptData } from "@/lib/receipts";

const PRIMARY = "#2563eb";
const PRIMARY_SOFT = "#eff6ff";
const BORDER = "#e2e8f0";
const MUTED = "#64748b";
const TEXT = "#0f172a";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: TEXT,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
    paddingBottom: 16,
    marginBottom: 20,
  },
  gymBlock: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  gymName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
  },
  gymMeta: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  receiptBlock: {
    alignItems: "flex-end",
  },
  receiptTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginBottom: 3,
  },
  receiptMeta: {
    fontSize: 9,
    color: MUTED,
  },
  card: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: PRIMARY_SOFT,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 10,
    color: MUTED,
  },
  amountValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
  },
  footer: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    fontSize: 8,
    color: MUTED,
    textAlign: "center",
  },
});

function formatPdfDate(value: Date | null): string {
  if (!value) return "\u2014";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatPdfCurrency(value: number): string {
  return `Rs. ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ReceiptDocument({ receipt }: { receipt: ReceiptData }) {
  const receiptNumber = formatReceiptNumber(receipt.number);
  const methodLabel = METHOD_LABEL[receipt.method] ?? receipt.method;
  const hasPeriod = receipt.periodStart && receipt.periodEnd;

  return (
    <Document title={receiptNumber}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.gymBlock}>
            {receipt.gymLogoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={receipt.gymLogoUrl} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.gymName}>{receipt.gymName}</Text>
              {receipt.gymAddress ? (
                <Text style={styles.gymMeta}>{receipt.gymAddress}</Text>
              ) : null}
              {receipt.gymPhone ? (
                <Text style={styles.gymMeta}>Ph: {receipt.gymPhone}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.receiptBlock}>
            <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
            <Text style={styles.receiptMeta}>{receiptNumber}</Text>
            <Text style={styles.receiptMeta}>
              Date: {formatPdfDate(receipt.paidAt)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Billed to</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Member name</Text>
              <Text style={styles.value}>{receipt.memberName}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Phone number</Text>
              <Text style={styles.value}>{receipt.memberPhone}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Member ID</Text>
              <Text style={styles.value}>{receipt.memberId}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment details</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Package / subscription</Text>
              <Text style={styles.value}>
                {receipt.packageName ?? "General payment"}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Payment method</Text>
              <Text style={styles.value}>{methodLabel}</Text>
            </View>
          </View>
          {hasPeriod ? (
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Subscription validity period</Text>
                <Text style={styles.value}>
                  {formatPdfDate(receipt.periodStart)} to{" "}
                  {formatPdfDate(receipt.periodEnd)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount paid</Text>
          <Text style={styles.amountValue}>
            {formatPdfCurrency(receipt.amount)}
          </Text>
        </View>

        {receipt.amountOwed != null ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Installment summary</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Total owed (this period)</Text>
                <Text style={styles.value}>
                  {formatPdfCurrency(receipt.amountOwed)}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Balance remaining</Text>
                <Text style={styles.value}>
                  {formatPdfCurrency(receipt.balanceAfter ?? 0)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text>
            Thank you for your payment. This is a computer-generated receipt
            and does not require a signature.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
