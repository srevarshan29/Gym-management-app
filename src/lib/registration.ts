import type { MemberGender, VisitorStatus } from "@prisma/client";

import { withPlatformLookup, withTenant } from "@/lib/db-context";

export type GymRegistrationInfo = {
  id: string;
  name: string;
  registrationToken: string;
};

export function getAppBaseUrl(): string {
  if (process.env.AUTH_URL) {
    return process.env.AUTH_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
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
