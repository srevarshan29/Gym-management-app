"use client";

import * as React from "react";

import {
  formatReceiptDisplayCurrency,
  formatReceiptDisplayDate,
  formatReceiptNumber,
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
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b-2 border-blue-600 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {receipt.gymLogoUrl && logoVisible ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={receipt.gymLogoUrl}
              alt=""
              width={44}
              height={44}
              loading="lazy"
              decoding="async"
              className="h-11 w-11 shrink-0 rounded-lg object-cover"
              onError={() => setLogoVisible(false)}
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-base font-bold text-blue-600">{receipt.gymName}</p>
            {receipt.gymAddress ? (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {receipt.gymAddress}
              </p>
            ) : null}
            {receipt.gymPhone ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ph: {receipt.gymPhone}
              </p>
            ) : null}
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-sm font-bold text-blue-600">PAYMENT RECEIPT</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{receiptNumber}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Date: {formatReceiptDisplayDate(paidAt)}
          </p>
        </div>
      </div>

      <section className="mt-5 rounded-lg border border-slate-200 p-3.5 dark:border-slate-700">
        <p className="mb-2.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">
          Billed to
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Member name" value={receipt.memberName} />
          <Field label="Phone number" value={receipt.memberPhone} />
          <Field label="Member ID" value={receipt.memberId} />
        </div>
      </section>

      <section className="mt-3.5 rounded-lg border border-slate-200 p-3.5 dark:border-slate-700">
        <p className="mb-2.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">
          Payment details
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Package / subscription"
            value={receipt.packageName ?? "General payment"}
          />
          <Field label="Payment method" value={methodLabel} />
        </div>
        {hasPeriod ? (
          <div className="mt-3">
            <Field
              label="Subscription validity period"
              value={`${formatReceiptDisplayDate(periodStart)} to ${formatReceiptDisplayDate(periodEnd)}`}
            />
          </div>
        ) : null}
      </section>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-4 dark:bg-blue-950/40">
        <span className="text-sm text-slate-500 dark:text-slate-400">Amount paid</span>
        <span className="text-xl font-bold text-blue-600">
          {formatReceiptDisplayCurrency(receipt.amount)}
        </span>
      </div>

      {receipt.amountOwed != null ? (
        <section className="mt-3.5 rounded-lg border border-slate-200 p-3.5 dark:border-slate-700">
          <p className="mb-2.5 text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">
            Installment summary
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Total owed (this period)"
              value={formatReceiptDisplayCurrency(receipt.amountOwed)}
            />
            <Field
              label="Balance remaining"
              value={formatReceiptDisplayCurrency(receipt.balanceAfter ?? 0)}
            />
          </div>
        </section>
      ) : null}

      <p className="mt-5 border-t border-slate-200 pt-3 text-center text-[0.65rem] text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Thank you for your payment. This is a computer-generated receipt and does not
        require a signature.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.65rem] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
