/**
 * Shown immediately on member tab navigations while the route segment loads.
 * Without this, the main area stays on the previous page until server data resolves.
 */
export default function MemberPortalLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-7 w-36 rounded-lg bg-muted" />
        <div className="h-4 w-full max-w-xs rounded bg-muted" />
      </div>
      <div className="h-28 rounded-2xl bg-muted" />
      <div className="h-28 rounded-2xl bg-muted" />
      <div className="h-20 rounded-2xl bg-muted" />
    </div>
  );
}
