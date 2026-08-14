import { createHash } from "crypto";
import { headers } from "next/headers";

import { withPlatformLookup } from "@/lib/db-context";
import { getClientIp } from "@/lib/rate-limit";

/** Per-account: enough for typos, not enough for a password spray. */
const EMAIL_FAIL_LIMIT = 8;
const EMAIL_WINDOW_MS = 15 * 60 * 1000;

/**
 * Shared office NAT should not lock the gym after a few mistakes.
 * Still caps a single IP spraying many accounts.
 */
const IP_FAIL_LIMIT = 25;
const IP_WINDOW_MS = 15 * 60 * 1000;

export type StaffLoginThrottleResult =
  | { ok: true }
  | { ok: false; retryAfterMs: number };

function hashThrottlePart(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 40);
}

function emailThrottleKey(email: string): string {
  return `staff-login:email:${hashThrottlePart(email.trim().toLowerCase())}`;
}

function ipThrottleKey(ip: string): string {
  return `staff-login:ip:${hashThrottlePart(ip)}`;
}

export async function getStaffLoginClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const vercel = headerList.get("x-vercel-forwarded-for");
    if (vercel?.trim()) {
      return getClientIp(vercel);
    }
    const forwarded = headerList.get("x-forwarded-for");
    if (forwarded?.trim()) {
      return getClientIp(forwarded);
    }
    return getClientIp(headerList.get("x-real-ip"));
  } catch {
    return "unknown";
  }
}

export function staffLoginRetryMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return `Too many sign-in attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

async function readBucket(
  key: string,
): Promise<{ failCount: number; windowEndsAt: Date } | null> {
  try {
    return await withPlatformLookup((tx) =>
      tx.staffLoginThrottle.findUnique({
        where: { key },
        select: { failCount: true, windowEndsAt: true },
      }),
    );
  } catch (error) {
    console.error("[staff-login-throttle] read failed; allowing attempt", error);
    return null;
  }
}

function isBlocked(
  row: { failCount: number; windowEndsAt: Date } | null,
  limit: number,
  now: Date,
): number {
  if (!row) return 0;
  if (row.windowEndsAt.getTime() <= now.getTime()) return 0;
  if (row.failCount < limit) return 0;
  return row.windowEndsAt.getTime() - now.getTime();
}

export async function checkStaffLoginThrottle(
  email: string,
  ip: string,
): Promise<StaffLoginThrottleResult> {
  const now = new Date();
  const emailKey = emailThrottleKey(email);
  const ipKey = ipThrottleKey(ip);

  const [emailRow, ipRow] = await Promise.all([
    readBucket(emailKey),
    readBucket(ipKey),
  ]);

  const emailRetry = isBlocked(emailRow, EMAIL_FAIL_LIMIT, now);
  const ipRetry = isBlocked(ipRow, IP_FAIL_LIMIT, now);
  const retryAfterMs = Math.max(emailRetry, ipRetry);

  if (retryAfterMs > 0) {
    return { ok: false, retryAfterMs };
  }
  return { ok: true };
}

async function bumpBucket(
  key: string,
  windowMs: number,
  now: Date,
): Promise<void> {
  const existing = await withPlatformLookup((tx) =>
    tx.staffLoginThrottle.findUnique({
      where: { key },
      select: { failCount: true, windowEndsAt: true },
    }),
  );

  if (!existing || existing.windowEndsAt.getTime() <= now.getTime()) {
    await withPlatformLookup((tx) =>
      tx.staffLoginThrottle.upsert({
        where: { key },
        create: {
          key,
          failCount: 1,
          windowEndsAt: new Date(now.getTime() + windowMs),
        },
        update: {
          failCount: 1,
          windowEndsAt: new Date(now.getTime() + windowMs),
        },
      }),
    );
    return;
  }

  await withPlatformLookup((tx) =>
    tx.staffLoginThrottle.update({
      where: { key },
      data: { failCount: { increment: 1 } },
    }),
  );
}

export async function recordStaffLoginFailure(
  email: string,
  ip: string,
): Promise<void> {
  const now = new Date();
  try {
    await bumpBucket(emailThrottleKey(email), EMAIL_WINDOW_MS, now);
    await bumpBucket(ipThrottleKey(ip), IP_WINDOW_MS, now);
  } catch (error) {
    console.error("[staff-login-throttle] record failure failed", error);
  }
}

export async function clearStaffLoginFailures(
  email: string,
  ip: string,
): Promise<void> {
  try {
    await withPlatformLookup((tx) =>
      tx.staffLoginThrottle.deleteMany({
        where: {
          key: { in: [emailThrottleKey(email), ipThrottleKey(ip)] },
        },
      }),
    );
  } catch (error) {
    console.error("[staff-login-throttle] clear failed", error);
  }
}
