/** Sync ?date= in the URL without triggering a Next.js RSC navigation. */
export function syncMemberNutritionDateUrl(logDate: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("date", logDate);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
}
