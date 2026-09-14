import { headers } from "next/headers";



import { getRepositories, platformContext } from "@/lib/firestore";

import {

  VISITORS_PAGE_SIZE,

} from "@/lib/firestore/repositories/visitors";

import type {
  QrRegistrationListItem,
  QrRegistrationRow,
} from "@/lib/registration-types";
import type { VisitorStatusFilter } from "@/lib/visitor-types";

export type {
  QrRegistrationListItem,
  QrRegistrationRow,
} from "@/lib/registration-types";



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



  const { gyms } = getRepositories();

  const gym = await gyms.findByRegistrationToken(platformContext, trimmed);

  if (!gym) return null;



  return {

    id: gym.id,

    name: gym.name,

    registrationToken: gym.registrationToken,

  };

}



export async function getGymRegistrationToken(

  tenantGymId: string,

): Promise<string | null> {

  const { gyms } = getRepositories();

  return gyms.getRegistrationToken(platformContext, tenantGymId);

}



export type QrRegistrationsPageData = {

  registrations: QrRegistrationListItem[];

  total: number;

  page: number;

  pageSize: number;

};



export async function getQrRegistrationsPage(

  tenantGymId: string,

  status: VisitorStatusFilter = "pending",

  page = 1,

): Promise<QrRegistrationsPageData> {

  const { visitors } = getRepositories();

  const result = await visitors.listQrPage(platformContext, tenantGymId, {

    status,

    page,

    pageSize: VISITORS_PAGE_SIZE,

  });



  return {

    registrations: result.items.map((doc) => ({

      id: doc.id,

      name: doc.name,

      phone: doc.phone,

      email: doc.email,

      gender: doc.gender,

      status: doc.status,

      createdAt: doc.createdAt.toDate(),

    })),

    total: result.total,

    page: result.page,

    pageSize: result.pageSize,

  };

}



/** @deprecated Use getQrRegistrationsPage for paginated lists. */

export async function getQrRegistrations(

  tenantGymId: string,

  status: VisitorStatusFilter = "pending",

): Promise<QrRegistrationListItem[]> {

  const page = await getQrRegistrationsPage(tenantGymId, status, 1);

  return page.registrations;

}



export type RegisterQrPageData = {

  registrationToken: string | null;

  registrations: QrRegistrationListItem[];

  total: number;

  page: number;

  pageSize: number;

};



export async function getRegisterQrPageData(

  tenantGymId: string,

  options: {

    status?: VisitorStatusFilter;

    page?: number;

  } = {},

): Promise<RegisterQrPageData> {

  const { gyms } = getRepositories();

  const [registrationToken, qrPage] = await Promise.all([

    gyms.getRegistrationToken(platformContext, tenantGymId),

    getQrRegistrationsPage(

      tenantGymId,

      options.status ?? "pending",

      options.page ?? 1,

    ),

  ]);



  return {

    registrationToken,

    registrations: qrPage.registrations,

    total: qrPage.total,

    page: qrPage.page,

    pageSize: qrPage.pageSize,

  };

}

