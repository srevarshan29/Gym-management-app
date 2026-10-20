/**
 * Lightweight in-flight feedback while a member portal child route loads.
 * Keeps the previous page visible underneath (no full-page skeleton).
 */
export default function MemberPortalLoading() {
  return (
    <div
      className="pointer-events-none space-y-2"
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className="h-0.5 w-full overflow-hidden rounded-full bg-muted/80"
        role="progressbar"
        aria-valuetext="Loading page"
      >
        <div className="h-full w-2/5 animate-member-portal-route-loading rounded-full bg-primary/90" />
      </div>
      <p className="sr-only">Loading page…</p>
    </div>
  );
}
