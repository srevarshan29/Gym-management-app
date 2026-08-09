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

/**
 * Public app origin from env (QR links, fallbacks).
 * On Vercel, set NEXT_PUBLIC_APP_URL to your canonical URL (custom domain if you use one).
 */
export function getAppBaseUrl(): string {
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) return normalizeBaseUrl(fromPublic);

  if (process.env.AUTH_URL) {
    return normalizeBaseUrl(process.env.AUTH_URL);
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel}`;
  }

  return "http://localhost:3000";
}

/**
 * Origin for links staff copy while using the app (member portal login, etc.).
 * Uses the incoming request host on the server so production matches the live site
 * even when NEXT_PUBLIC_APP_URL is unset; falls back to {@link getAppBaseUrl}.
 */
export async function getAppBaseUrlFromRequest(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const hostname = host.split(",")[0]?.trim();
    if (hostname) {
      const proto =
        h.get("x-forwarded-proto") ??
        (hostname.startsWith("localhost") || hostname.startsWith("127.0.0.1")
          ? "http"
          : "https");
      return normalizeBaseUrl(`${proto}://${hostname}`);
    }
  }
  return getAppBaseUrl();
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
