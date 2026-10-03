"use client";

import * as React from "react";

import {
  formatReceiptDisplayCurrency,
  formatReceiptDisplayDate,
  formatReceiptNumber,
  RECEIPT_COPY,
  RECEIPT_DESIGN,
  RECEIPT_FIELD_LABELS,
  receiptMethodLabel,
} from "@/lib/receipt-display";
import type { ReceiptPreviewData } from "@/lib/receipt-preview";
import { cn } from "@/lib/utils";

type ReceiptHtmlViewProps = {
  receipt: ReceiptPreviewData;
  className?: string;
};

export function ReceiptHtmlView({ receipt, className }: ReceiptHtmlViewProps) {
  const [logoVisible, setLogoVisible] = React.useState(Boolean(receipt.gymLogoUrl));
  const receiptNumber = formatReceiptNumber(receipt.number);
  const methodLabel = receiptMethodLabel(receipt.method);
  const paidAt = new Date(receipt.paidAt);
  const periodStart = receipt.periodStart ? new Date(receipt.periodStart) : null;
  const periodEnd = receipt.periodEnd ? new Date(receipt.periodEnd) : null;
  const hasPeriod = periodStart && periodEnd;

  return (
    <article
      className={cn(
        "min-w-0 max-w-full overflow-x-hidden border bg-white p-5 text-[#111827] sm:p-6",
        className,
      )}
      style={{
        borderColor: RECEIPT_DESIGN.border,
        backgroundColor: RECEIPT_DESIGN.background,
      }}
    >
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {receipt.gymLogoUrl && logoVisible ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={receipt.gymLogoUrl}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
              className="h-12 w-12 shrink-0 rounded-md object-cover"
              onError={() => setLogoVisible(false)}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="break-words text-base font-semibold leading-snug">
              {receipt.gymName}
            </p>
            {receipt.gymAddress ? (
              <p
                className="mt-1 break-words text-xs leading-relaxed"
                style={{ color: RECEIPT_DESIGN.textMuted }}
              >
                {receipt.gymAddress}
              </p>
            ) : null}
            {receipt.gymPhone ? (
              <p className="text-xs" style={{ color: RECEIPT_DESIGN.textMuted }}>
                {receipt.gymPhone}
              </p>
            ) : null}
          </div>
        </div>
        <div className="min-w-0 shrink-0 sm:text-right">
          <p
            className="text-xs font-bold tracking-wide"
            style={{ color: RECEIPT_DESIGN.text }}
          >
            {RECEIPT_COPY.documentTitle}
          </p>
          <p className="mt-1 font-mono text-xs" style={{ color: RECEIPT_DESIGN.textMuted }}>
            {receiptNumber}
          </p>
          <p className="text-xs" style={{ color: RECEIPT_DESIGN.textMuted }}>
            Date: {formatReceiptDisplayDate(paidAt)}
          </p>
        </div>
      </header>

      <hr className="my-5 border-0 border-t" style={{ borderColor: RECEIPT_DESIGN.border }} />

      <section className="min-w-0">
        <h2
          className="mb-3 text-[0.65rem] font-semibold tracking-[0.12em]"
          style={{ color: RECEIPT_DESIGN.textMuted }}
        >
          {RECEIPT_COPY.billedTo}
        </h2>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label={RECEIPT_FIELD_LABELS.memberName} value={receipt.memberName} />
          <Field label={RECEIPT_FIELD_LABELS.phoneNumber} value={receipt.memberPhone} />
        </div>
        <div className="mt-4 min-w-0">
          <Field
            label={RECEIPT_FIELD_LABELS.memberId}
            value={receipt.memberDisplayId}
          />
        </div>
      </section>

      <section className="mt-6 min-w-0">
        <h2
          className="mb-3 text-[0.65rem] font-semibold tracking-[0.12em]"
          style={{ color: RECEIPT_DESIGN.textMuted }}
        >
          {RECEIPT_COPY.paymentDetails}
        </h2>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field
            label={RECEIPT_FIELD_LABELS.package}
            value={receipt.packageName ?? RECEIPT_FIELD_LABELS.generalPayment}
          />
          <Field label={RECEIPT_FIELD_LABELS.paymentMethod} value={methodLabel} />
        </div>
        {hasPeriod ? (
          <div className="mt-4 min-w-0">
            <Field
              label={RECEIPT_FIELD_LABELS.subscriptionValidity}
              value={`${formatReceiptDisplayDate(periodStart)} to ${formatReceiptDisplayDate(periodEnd)}`}
            />
          </div>
        ) : null}
      </section>

      <div
        className="mt-6 min-w-0 rounded-md border px-4 py-5 sm:px-5"
        style={{
          borderColor: RECEIPT_DESIGN.border,
          backgroundColor: RECEIPT_DESIGN.accentSoft,
        }}
      >
        <p
          className="text-[0.65rem] font-semibold tracking-[0.12em]"
          style={{ color: RECEIPT_DESIGN.textMuted }}
        >
          {RECEIPT_COPY.amountPaid}
        </p>
        <p className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl">
          {formatReceiptDisplayCurrency(receipt.amount)}
        </p>
      </div>

      {receipt.amountOwed != null ? (
        <section className="mt-6 min-w-0">
          <h2
            className="mb-3 text-[0.65rem] font-semibold tracking-[0.12em]"
            style={{ color: RECEIPT_DESIGN.textMuted }}
          >
            {RECEIPT_COPY.installmentSummary}
          </h2>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field
              label={RECEIPT_FIELD_LABELS.totalOwed}
              value={formatReceiptDisplayCurrency(receipt.amountOwed)}
            />
            <Field
              label={RECEIPT_FIELD_LABELS.balanceRemaining}
              value={formatReceiptDisplayCurrency(receipt.balanceAfter ?? 0)}
            />
          </div>
        </section>
      ) : null}

      <footer
        className="mt-8 min-w-0 border-t pt-4 text-center"
        style={{ borderColor: RECEIPT_DESIGN.border }}
      >
        <p className="text-sm font-medium">{RECEIPT_COPY.footerThanks}</p>
        <p className="mt-2 break-words text-[0.65rem] leading-relaxed" style={{ color: RECEIPT_DESIGN.textMuted }}>
          {RECEIPT_COPY.footerLegal}
        </p>
      </footer>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] uppercase tracking-wide" style={{ color: RECEIPT_DESIGN.textMuted }}>
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold leading-snug [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}
