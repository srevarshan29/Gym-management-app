"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { browseMemberExerciseLibraryAction } from "@/app/actions/member-exercise-library";
import { MemberExerciseCard } from "@/components/member-portal/workout/member-exercise-card";
import { MemberMuscleGroupGrid } from "@/components/member-portal/workout/member-muscle-group-grid";
import { Input } from "@/components/ui/input";
import {
  memberLibraryFilterToCatalogMuscleGroup,
  memberLibraryGroupLabel,
  type MemberLibraryMuscleFilter,
} from "@/lib/member-portal/member-library-muscle-groups";
import {
  memberPersonalWorkoutAddExercisesHref,
  memberWorkoutPageHref,
} from "@/lib/member-portal/member-workout-tab-url";
import type { MemberCatalogListItem } from "@/lib/workout-tracking/member-catalog-exercises";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 280;

type MemberExerciseLibraryPanelProps = {
  className?: string;
  addToWorkoutId?: string | null;
  initialGroup?: MemberLibraryMuscleFilter | null;
  /** Tap-to-add exercises without opening the detail page first. */
  selectionMode?: boolean;
  doneHref?: string | null;
  /** When set, muscle-group navigation stays on the add-exercises route. */
  workoutIdForAddFlow?: string | null;
};

export function MemberExerciseLibraryPanel({
  className,
  addToWorkoutId = null,
  initialGroup = null,
  selectionMode = false,
  doneHref = null,
  workoutIdForAddFlow = null,
}: MemberExerciseLibraryPanelProps) {
  const router = useRouter();
  const [activeGroup, setActiveGroup] =
    React.useState<MemberLibraryMuscleFilter | null>(initialGroup);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [items, setItems] = React.useState<MemberCatalogListItem[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const searchSeqRef = React.useRef(0);

  React.useEffect(() => {
    setActiveGroup(initialGroup);
  }, [initialGroup]);

  React.useEffect(() => {
    const handle = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(handle);
  }, [query]);

  const catalogMuscleGroup = memberLibraryFilterToCatalogMuscleGroup(activeGroup);
  const browsingList =
    activeGroup !== null || debouncedQuery.length > 0;

  const loadPage = React.useCallback(
    async (opts: {
      reset: boolean;
      startAfterId?: string | null;
      seq: number;
    }) => {
      const result = await browseMemberExerciseLibraryAction({
        query: debouncedQuery || undefined,
        muscleGroup: catalogMuscleGroup,
        startAfterId: opts.startAfterId ?? null,
      });
      if (opts.seq !== searchSeqRef.current) return;
      if (!result.ok || !result.data) {
        toast.error(!result.ok ? result.error : "Could not load exercises.");
        return;
      }
      setItems((prev) =>
        opts.reset ? result.data!.items : [...prev, ...result.data!.items],
      );
      setCursor(result.data.nextCursor);
      setHasMore(result.data.hasMore);
    },
    [debouncedQuery, catalogMuscleGroup],
  );

  React.useEffect(() => {
    if (!browsingList) return;
    const seq = ++searchSeqRef.current;
    setLoading(true);
    void loadPage({ reset: true, seq }).finally(() => {
      if (seq === searchSeqRef.current) setLoading(false);
    });
  }, [debouncedQuery, catalogMuscleGroup, browsingList, loadPage]);

  const addFlowWorkoutId = workoutIdForAddFlow?.trim() || null;

  function libraryLocationHref(group: MemberLibraryMuscleFilter | null) {
    if (addFlowWorkoutId) {
      return memberPersonalWorkoutAddExercisesHref(addFlowWorkoutId, group);
    }
    return memberWorkoutPageHref({
      tab: "library",
      addTo: addToWorkoutId,
      group,
    });
  }

  function selectGroup(group: MemberLibraryMuscleFilter) {
    setActiveGroup(group);
    setQuery("");
    router.replace(libraryLocationHref(group), { scroll: false });
  }

  function clearGroup() {
    setActiveGroup(null);
    setQuery("");
    router.replace(libraryLocationHref(null), { scroll: false });
  }

  async function onLoadMore() {
    if (!hasMore || !cursor || loadingMore) return;
    setLoadingMore(true);
    const seq = searchSeqRef.current;
    try {
      await loadPage({ reset: false, startAfterId: cursor, seq });
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {addToWorkoutId && selectionMode ? (
        <div
          className="member-workout-card flex flex-wrap items-center justify-between gap-2 border-primary/25 bg-primary/5 px-3 py-2.5 text-sm"
        >
          <p className="text-muted-foreground">
            Tap exercises to add. You can pick several.
          </p>
          {doneHref ? (
            <Link
              href={doneHref}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
            >
              Done
            </Link>
          ) : null}
        </div>
      ) : addToWorkoutId ? (
        <div className="member-workout-card border-primary/25 bg-primary/5 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Adding to your workout — </span>
          <Link
            href={memberWorkoutPageHref({ tab: "mine" })}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            My Workouts
          </Link>
        </div>
      ) : null}

      {!browsingList ? (
        <>
          <div>
            <h2 className="font-display text-lg font-bold">Exercise library</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a muscle group or search all exercises.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim()) {
                  setActiveGroup(null);
                }
              }}
              placeholder="Search all exercises"
              className="h-12 border-border/80 bg-card/50 pl-9 text-base"
              autoComplete="off"
            />
          </div>
          <MemberMuscleGroupGrid onSelect={selectGroup} />
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card/80"
              aria-label="Back to muscle groups"
              onClick={() => clearGroup()}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="font-display truncate text-lg font-bold">
                {debouncedQuery
                  ? `Search: ${debouncedQuery}`
                  : activeGroup
                    ? memberLibraryGroupLabel(activeGroup)
                    : "Exercises"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {debouncedQuery
                  ? "Across all muscle groups"
                  : "RepDB catalog"}
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter in this list"
              className="h-11 border-border/80 bg-card/50 pl-9 text-base"
              autoComplete="off"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No exercises found.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {items.map((item) => (
                <MemberExerciseCard
                  key={item.catalogId}
                  item={item}
                  addToWorkoutId={addToWorkoutId}
                  group={activeGroup}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          )}

          {hasMore && !loading ? (
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-border/80 bg-card/60 text-sm font-semibold text-primary"
              onClick={() => void onLoadMore()}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Load more"
              )}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
