import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

import {
  DEFAULT_MEMBERSHIP_EXPIRY_3_DAY,
  DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
} from "@/lib/notification-settings/defaults";
import { buildMembershipExpiryEmailFromSettings } from "@/lib/notification-settings/membership-expiry-email";
import { mergeGymNotificationSettings } from "@/lib/notification-settings/merge";
import { buildPaymentReceiptEmailContent } from "@/lib/notification-settings/payment-receipt-email";
import {
  buildCoreNotificationTemplateVariables,
  NOTIFICATION_MISSING_VALUE,
  plainTextToHtml,
  substituteNotificationTemplate,
} from "@/lib/notification-settings/template-variables";
import type { GymNotificationSettingsDoc } from "@/lib/firestore/types";
import type { ReceiptData } from "@/lib/receipts";

const paidAt = new Date("2026-10-04T10:00:00.000Z");
const periodEnd = new Date("2026-10-14T00:00:00.000Z");

const baseReceipt: ReceiptData = {
  id: "rcpt-1",
  number: 73,
  createdAt: paidAt,
  gymName: "Iron Gym",
  gymAddress: null,
  gymPhone: null,
  gymLogoUrl: null,
  memberId: "m1",
  memberNumber: 49,
  memberDisplayId: "#0049",
  memberName: "Priya Sharma",
  memberPhone: "7777777777",
  memberEmail: "priya@example.com",
  packageName: "Annual",
  amount: 1000,
  amountOwed: null,
  balanceAfter: null,
  method: "CASH",
  paidAt,
  periodStart: new Date("2026-10-04T00:00:00.000Z"),
  periodEnd,
};

describe("substituteNotificationTemplate", () => {
  const vars = buildCoreNotificationTemplateVariables({
    memberName: "Priya",
    gymName: "Iron Gym",
    expiryDate: periodEnd,
    daysRemaining: 7,
  });

  it("replaces all four core variables correctly", () => {
    const result = substituteNotificationTemplate(
      "{{member_name}} at {{gym_name}} until {{expiry_date}} ({{days_remaining}} days)",
      vars,
    );
    expect(result).toContain("Priya");
    expect(result).toContain("Iron Gym");
    expect(result).toContain("7");
    expect(result).not.toContain("{{member_name}}");
  });

  it("replaces multiple occurrences of the same variable", () => {
    const result = substituteNotificationTemplate(
      "{{member_name}} — hello {{member_name}}",
      vars,
    );
    expect(result).toBe("Priya — hello Priya");
  });

  it("leaves unknown variables unchanged", () => {
    const result = substituteNotificationTemplate(
      "Hi {{member_name}}, ref {{unknown_token}}",
      vars,
    );
    expect(result).toBe("Hi Priya, ref {{unknown_token}}");
  });

  it("does not treat partial braces as variables", () => {
    const result = substituteNotificationTemplate("{member_name} {{member_name}}", vars);
    expect(result).toBe("{member_name} Priya");
  });

  it("uses missing placeholder for optional expiry values", () => {
    const missing = buildCoreNotificationTemplateVariables({
      memberName: "Priya",
      gymName: "Iron Gym",
      expiryDate: null,
      daysRemaining: null,
    });
    const result = substituteNotificationTemplate(
      "Ends {{expiry_date}} / {{days_remaining}}",
      missing,
    );
    expect(result).toBe(`Ends ${NOTIFICATION_MISSING_VALUE} / ${NOTIFICATION_MISSING_VALUE}`);
  });
});

describe("plainTextToHtml", () => {
  it("escapes HTML in substituted content", () => {
    const html = plainTextToHtml('<script>alert("x")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("buildPaymentReceiptEmailContent", () => {
  it("substitutes payment receipt template variables in subject and body", () => {
    const { subject, html } = buildPaymentReceiptEmailContent(baseReceipt, {
      enabled: true,
      subject:
        "{{member_name}} paid {{gym_name}} — valid until {{expiry_date}} ({{days_remaining}} days)",
      body: "Receipt {{receipt_number}} for {{member_name}} at {{gym_name}}.",
    });

    expect(subject).toContain("Priya Sharma");
    expect(subject).toContain("Iron Gym");
    expect(subject).toContain("10");
    expect(html).toContain("RCPT-0073");
    expect(html).not.toContain("{{receipt_number}}");
    expect(html).not.toContain("<script>");
  });

  it("uses em dash when subscription end date is missing", () => {
    const { subject } = buildPaymentReceiptEmailContent(
      { ...baseReceipt, periodEnd: null, periodStart: null },
      {
        enabled: true,
        subject: "{{expiry_date}} / {{days_remaining}}",
        body: "Thanks",
      },
    );

    expect(subject).toBe(`${NOTIFICATION_MISSING_VALUE} / ${NOTIFICATION_MISSING_VALUE}`);
  });
});

describe("buildMembershipExpiryEmailFromSettings", () => {
  it("substitutes 7-day expiry template", () => {
    const expiryDate = new Date("2026-10-11T12:00:00.000Z");
    const { subject, text } = buildMembershipExpiryEmailFromSettings(
      DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
      {
        memberName: "Arjun",
        gymName: "Iron Gym",
        expiryDate,
        daysRemaining: 7,
      },
    );

    expect(subject).toContain("7");
    expect(subject).toContain("Iron Gym");
    expect(text).toContain("Arjun");
    expect(text).not.toContain("{{member_name}}");
  });

  it("substitutes 3-day expiry template", () => {
    const expiryDate = new Date("2026-10-07T08:00:00.000Z");
    const { subject, text } = buildMembershipExpiryEmailFromSettings(
      {
        enabled: true,
        subject: "{{days_remaining}} days — {{gym_name}}",
        body: "Hi {{member_name}}, renew by {{expiry_date}}.",
      },
      {
        memberName: "Meera",
        gymName: "Iron Gym",
        expiryDate,
        daysRemaining: 3,
      },
    );

    expect(subject).toBe("3 days — Iron Gym");
    expect(text).toContain("Meera");
    expect(text).not.toContain("{{expiry_date}}");
  });
});

describe("mergeGymNotificationSettings", () => {
  it("keeps customized Firestore templates unchanged", () => {
    const stored: GymNotificationSettingsDoc = {
      gymId: "gym-a",
      paymentReceiptEmail: {
        enabled: true,
        subject: "Custom owner subject {{member_name}}",
        body: "Owner body only for {{gym_name}}",
      },
      membershipExpiry7Day: DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
      membershipExpiry3Day: DEFAULT_MEMBERSHIP_EXPIRY_3_DAY,
      updatedAt: Timestamp.now(),
    };

    const merged = mergeGymNotificationSettings("gym-a", stored);
    expect(merged.paymentReceiptEmail.subject).toBe(
      "Custom owner subject {{member_name}}",
    );
    expect(merged.paymentReceiptEmail.body).toBe(
      "Owner body only for {{gym_name}}",
    );
  });
});
