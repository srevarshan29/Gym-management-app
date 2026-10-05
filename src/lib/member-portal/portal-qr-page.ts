import { getRepositories, platformContext } from "@/lib/firestore";
import { getAppBaseUrlFromRequest } from "@/lib/registration";

import { buildMemberPortalLoginUrl } from "@/lib/member-portal/portal-entry-url";

export type MemberPortalQrPageData = {
  registrationToken: string | null;
  portalLoginUrl: string | null;
};

export async function getMemberPortalQrPageData(
  gymId: string,
): Promise<MemberPortalQrPageData> {
  const { gyms } = getRepositories();
  const registrationToken = await gyms.getRegistrationToken(
    platformContext,
    gymId,
  );

  if (!registrationToken) {
    return { registrationToken: null, portalLoginUrl: null };
  }

  const base = await getAppBaseUrlFromRequest();
  const portalLoginUrl = buildMemberPortalLoginUrl(base, registrationToken);

  return { registrationToken, portalLoginUrl };
}
