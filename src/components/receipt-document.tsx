import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

import {
  formatReceiptDisplayCurrency,
  formatReceiptDisplayDate,
  formatReceiptNumber,
  RECEIPT_COPY,
  RECEIPT_DESIGN,
  RECEIPT_FIELD_LABELS,
  receiptMethodLabel,
} from "@/lib/receipt-display";
import type { ReceiptData } from "@/lib/receipts";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: RECEIPT_DESIGN.text,
    backgroundColor: RECEIPT_DESIGN.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  gymBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    maxWidth: "55%",
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 10,
  },
  gymName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: RECEIPT_DESIGN.text,
  },
  gymMeta: {
    fontSize: 9,
    color: RECEIPT_DESIGN.textMuted,
    marginTop: 3,
  },
  receiptBlock: {
    alignItems: "flex-end",
    maxWidth: "40%",
  },
  receiptTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    color: RECEIPT_DESIGN.text,
  },
  receiptMeta: {
    fontSize: 9,
    color: RECEIPT_DESIGN.textMuted,
    marginTop: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: RECEIPT_DESIGN.border,
    marginBottom: 18,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: RECEIPT_DESIGN.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    marginBottom: 10,
  },
  col: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontSize: 8,
    color: RECEIPT_DESIGN.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: RECEIPT_DESIGN.text,
  },
  amountBox: {
    borderWidth: 1,
    borderColor: RECEIPT_DESIGN.border,
    backgroundColor: RECEIPT_DESIGN.accentSoft,
    borderRadius: 6,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  amountLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: RECEIPT_DESIGN.textMuted,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: RECEIPT_DESIGN.text,
  },
  footer: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: RECEIPT_DESIGN.border,
    textAlign: "center",
  },
  footerThanks: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: RECEIPT_DESIGN.text,
    marginBottom: 6,
  },
  footerLegal: {
    fontSize: 8,
    color: RECEIPT_DESIGN.textMuted,
  },
});

export function ReceiptDocument({ receipt }: { receipt: ReceiptData }) {
  const receiptNumber = formatReceiptNumber(receipt.number);
  const methodLabel = receiptMethodLabel(receipt.method);
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
                <Text style={styles.gymMeta}>{receipt.gymPhone}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.receiptBlock}>
            <Text style={styles.receiptTitle}>{RECEIPT_COPY.documentTitle}</Text>
            <Text style={styles.receiptMeta}>{receiptNumber}</Text>
            <Text style={styles.receiptMeta}>
              Date: {formatReceiptDisplayDate(receipt.paidAt)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{RECEIPT_COPY.billedTo}</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>{RECEIPT_FIELD_LABELS.memberName}</Text>
              <Text style={styles.value}>{receipt.memberName}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>{RECEIPT_FIELD_LABELS.phoneNumber}</Text>
              <Text style={styles.value}>{receipt.memberPhone}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>{RECEIPT_FIELD_LABELS.memberId}</Text>
              <Text style={styles.value}>{receipt.memberId}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{RECEIPT_COPY.paymentDetails}</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>{RECEIPT_FIELD_LABELS.package}</Text>
              <Text style={styles.value}>
                {receipt.packageName ?? RECEIPT_FIELD_LABELS.generalPayment}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>{RECEIPT_FIELD_LABELS.paymentMethod}</Text>
              <Text style={styles.value}>{methodLabel}</Text>
            </View>
          </View>
          {hasPeriod ? (
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>
                  {RECEIPT_FIELD_LABELS.subscriptionValidity}
                </Text>
                <Text style={styles.value}>
                  {formatReceiptDisplayDate(receipt.periodStart)} to{" "}
                  {formatReceiptDisplayDate(receipt.periodEnd)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>{RECEIPT_COPY.amountPaid}</Text>
          <Text style={styles.amountValue}>
            {formatReceiptDisplayCurrency(receipt.amount)}
          </Text>
        </View>

        {receipt.amountOwed != null ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{RECEIPT_COPY.installmentSummary}</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>{RECEIPT_FIELD_LABELS.totalOwed}</Text>
                <Text style={styles.value}>
                  {formatReceiptDisplayCurrency(receipt.amountOwed)}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>
                  {RECEIPT_FIELD_LABELS.balanceRemaining}
                </Text>
                <Text style={styles.value}>
                  {formatReceiptDisplayCurrency(receipt.balanceAfter ?? 0)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerThanks}>{RECEIPT_COPY.footerThanks}</Text>
          <Text style={styles.footerLegal}>{RECEIPT_COPY.footerLegal}</Text>
        </View>
      </Page>
    </Document>
  );
}
