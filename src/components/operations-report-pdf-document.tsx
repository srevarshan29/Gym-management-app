import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { OperationsReportPdfPayload } from "@/lib/operations-reports/pdf-export";
import { RECEIPT_DESIGN } from "@/lib/receipt-display";

const BRAND = {
  charcoal: RECEIPT_DESIGN.text,
  muted: RECEIPT_DESIGN.textMuted,
  border: RECEIPT_DESIGN.border,
  lime: RECEIPT_DESIGN.accent,
  limeSoft: RECEIPT_DESIGN.accentSoft,
  paper: RECEIPT_DESIGN.background,
  headerBg: "#F9FAFB",
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 32,
    paddingBottom: 44,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: BRAND.charcoal,
    backgroundColor: BRAND.paper,
  },
  brandHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.lime,
  },
  brandLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: BRAND.charcoal,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkLetter: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BRAND.lime,
  },
  brandWord: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    color: BRAND.charcoal,
  },
  brandTag: {
    fontSize: 7,
    color: BRAND.muted,
    letterSpacing: 1.2,
    marginTop: 1,
  },
  gymName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND.charcoal,
    textAlign: "right",
    maxWidth: "45%",
  },
  reportTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    color: BRAND.charcoal,
  },
  rangePill: {
    alignSelf: "flex-start",
    backgroundColor: BRAND.headerBg,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  rangeText: {
    fontSize: 8,
    color: BRAND.muted,
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: BRAND.muted,
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  metricRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 6,
    borderTopWidth: 3,
    borderTopColor: BRAND.lime,
    backgroundColor: BRAND.paper,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  metricValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BRAND.charcoal,
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 7,
    color: BRAND.muted,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND.headerBg,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: BRAND.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BRAND.border,
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: BRAND.paper,
  },
  tableRowAlt: {
    backgroundColor: "#FCFCFC",
  },
  tableCell: {
    fontSize: 8,
    color: BRAND.charcoal,
    paddingRight: 4,
  },
  emptyWrap: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 8,
    borderStyle: "dashed",
    backgroundColor: BRAND.headerBg,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND.charcoal,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 9,
    color: BRAND.muted,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: BRAND.muted,
  },
  footerBrand: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: BRAND.charcoal,
  },
});

type OperationsReportPdfDocumentProps = {
  payload: OperationsReportPdfPayload;
};

function parseSummaryCards(lines: string[]): { label: string; value: string }[] {
  return lines.slice(0, 3).map((line) => {
    const colon = line.indexOf(":");
    if (colon === -1) return { label: line, value: "" };
    return {
      label: line.slice(0, colon).trim(),
      value: line.slice(colon + 1).trim(),
    };
  });
}

function displayColumnHeader(header: string): string {
  if (header === "Check-in") return "Time";
  if (header === "Name") return "Member Name";
  return header;
}

function columnFlex(header: string, index: number, headers: string[]): number {
  const key = displayColumnHeader(header).toLowerCase();
  if (key.includes("member name") || key === "name") return 1.45;
  if (key.includes("time") || key.includes("check-in")) return 1.15;
  if (key.includes("date") || key.includes("registered") || key.includes("start")) {
    return 1;
  }
  if (key.includes("member #")) return 0.75;
  if (key.includes("method") || key.includes("type")) return 0.85;
  if (key.includes("amount")) return 0.95;
  if (key.includes("receipt")) return 0.9;
  if (key.includes("package")) return 1.1;
  if (key.includes("status")) return 0.9;
  return index === headers.length - 1 ? 0.9 : 1;
}

function ReportPageFooter({
  startDateKey,
  endDateKey,
}: {
  startDateKey: string;
  endDateKey: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerBrand}>GymDesk</Text>
      <Text style={styles.footerText}>
        {startDateKey} – {endDateKey}
      </Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

export function OperationsReportPdfDocument({
  payload,
}: OperationsReportPdfDocumentProps) {
  const summaryCards = parseSummaryCards(payload.summaryLines);
  const flexes = payload.headers.map((h, i) =>
    columnFlex(h, i, payload.headers),
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.brandHeader}>
          <View style={styles.brandLeft}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkLetter}>G</Text>
            </View>
            <View>
              <Text style={styles.brandWord}>GymDesk</Text>
              <Text style={styles.brandTag}>BUSINESS REPORT</Text>
            </View>
          </View>
          <Text style={styles.gymName}>{payload.gymName}</Text>
        </View>

        <Text style={styles.reportTitle}>{payload.title}</Text>
        <View style={styles.rangePill}>
          <Text style={styles.rangeText}>{payload.rangeLabel}</Text>
        </View>

        <Text style={styles.sectionLabel}>SUMMARY</Text>
        <View style={styles.metricRow}>
          {summaryCards.map((card) => (
            <View key={card.label} style={styles.metricCard}>
              <Text style={styles.metricValue}>{card.value || "—"}</Text>
              <Text style={styles.metricLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>DETAIL</Text>
        {payload.emptyMessage ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No records</Text>
            <Text style={styles.emptyBody}>{payload.emptyMessage}</Text>
          </View>
        ) : (
          <>
            <View style={styles.tableHeader} fixed>
              {payload.headers.map((header, i) => (
                <Text
                  key={header}
                  style={[
                    styles.tableHeaderCell,
                    { flex: flexes[i] ?? 1 },
                  ]}
                >
                  {displayColumnHeader(header)}
                </Text>
              ))}
            </View>
            {payload.rows.map((row, rowIndex) => (
              <View
                key={`row-${rowIndex}`}
                style={
                  rowIndex % 2 === 1
                    ? [styles.tableRow, styles.tableRowAlt]
                    : styles.tableRow
                }
                wrap={false}
              >
                {row.map((cell, cellIndex) => (
                  <Text
                    key={`${rowIndex}-${cellIndex}`}
                    style={[styles.tableCell, { flex: flexes[cellIndex] ?? 1 }]}
                  >
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
          </>
        )}

        <ReportPageFooter
          startDateKey={payload.startDateKey}
          endDateKey={payload.endDateKey}
        />
      </Page>
    </Document>
  );
}
