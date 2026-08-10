import type { MemberGender, VisitorStatus } from "@prisma/client";
import { headers } from "next/headers";

import { withPlatformLookup, withTenant } from "@/lib/db-context";

export type GymRegistrationInfo = {
  id: string;
  name: string;
  registrationToken: string;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function hostFromUrl(url: string): string | null {
  try {
    const withScheme = url.startsWith("http") ? url : `https://${url}`;
    return new URL(withScheme).hostname;
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.startsWith("127.0.0.1") ||
    hostname.endsWith(".localhost")
  );
}

/**
 * Canonical public origin for member-facing links (QR registration, portal login).
 * Never uses preview deployment hosts — preview URLs are Vercel password-protected.
 *
 * Priority: NEXT_PUBLIC_APP_URL → VERCEL_PROJECT_PRODUCTION_URL → production VERCEL_URL
 * → AUTH_URL → localhost.
 */
export function getAppBaseUrl(): string {
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) return normalizeBaseUrl(fromPublic);

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return normalizeBaseUrl(`https://${productionHost}`);
  }

  if (process.env.VERCEL_ENV === "production") {
    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) return normalizeBaseUrl(`https://${vercel}`);
  }

  if (process.env.AUTH_URL) {
    return normalizeBaseUrl(process.env.AUTH_URL);
  }

  return "http://localhost:3000";
}

/**
 * Origin for links staff copy while using the app (member portal login, etc.).
 * Uses the incoming request host only on trusted hosts (local dev or canonical
 * production). Preview deployments always use {@link getAppBaseUrl}.
 */
export async function getAppBaseUrlFromRequest(): Promise<string> {
  const canonical = getAppBaseUrl();

  if (process.env.VERCEL_ENV === "preview") {
    return canonical;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return canonical;

  const hostname = host.split(",")[0]?.trim();
  if (!hostname) return canonical;

  const canonicalHost = hostFromUrl(canonical);
  if (
    canonicalHost &&
    (hostname === canonicalHost || isLocalHostname(hostname))
  ) {
    const proto =
      h.get("x-forwarded-proto") ??
      (isLocalHostname(hostname) ? "http" : "https");
    return normalizeBaseUrl(`${proto}://${hostname}`);
  }

  return canonical;
}

export function getRegistrationUrl(token: string): string {
  return `${getAppBaseUrl()}/register/${encodeURIComponent(token)}`;
}

export async function getGymByRegistrationToken(
  token: string,
): Promise<GymRegistrationInfo | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  return withPlatformLookup((tx) =>
    tx.gym.findFirst({
      where: { registrationToken: trimmed },
      select: { id: true, name: true, registrationToken: true },
    }),
  );
}

export async function getGymRegistrationToken(gymId: string): Promise<string> {
  const gym = await withTenant(gymId, (tx) =>
    tx.gym.findFirst({
      where: { id: gymId },
      select: { registrationToken: true },
    }),
  );
  if (!gym?.registrationToken) {
    throw new Error("Gym registration token not found.");
  }
  return gym.registrationToken;
}

export type QrRegistrationListItem = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: MemberGender | null;
  status: VisitorStatus;
  createdAt: Date;
};

export async function getQrRegistrations(
  gymId: string,
  status: "pending" | "converted" | "all" = "pending",
): Promise<QrRegistrationListItem[]> {
  return withTenant(gymId, (tx) =>
    tx.visitor.findMany({
      where: {
        gymId,
        source: "qr_registration",
        ...(status !== "all" ? { status } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        gender: true,
        status: true,
        createdAt: true,
      },
    }),
  );
}

export type RegisterQrPageData = {
  registrationToken: string;
  registrations: QrRegistrationListItem[];
};

/** Single transaction for register-qr page — avoids parallel pool contention. */
export async function getRegisterQrPageData(
  gymId: string,
  status: "pending" | "converted" | "all" = "pending",
): Promise<RegisterQrPageData> {
  return withTenant(gymId, async (tx) => {
    const gym = await tx.gym.findFirst({
      where: { id: gymId },
      select: { registrationToken: true },
    });
    if (!gym?.registrationToken) {
      throw new Error("Gym registration token not found.");
    }

    const registrations = await tx.visitor.findMany({
      where: {
        gymId,
        source: "qr_registration",
        ...(status !== "all" ? { status } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        gender: true,
        status: true,
        createdAt: true,
      },
    });

    return { registrationToken: gym.registrationToken, registrations };
  });
}
