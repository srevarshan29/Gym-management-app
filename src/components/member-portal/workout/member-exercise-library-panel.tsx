"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { browseMemberExerciseLibraryAction } from "@/app/actions/member-exercise-library";
import { addExercisesToPersonalWorkoutAction } from "@/app/actions/member-personal-workouts";
import { MemberMuscleRegionGrid } from "@/components/member-portal/workout/member-muscle-region-grid";
import { MemberExerciseCard } from "@/components/member-portal/workout/member-exercise-card";
import { MemberMuscleGroupGrid } from "@/components/member-portal/workout/member-muscle-group-grid";
import { memberLibraryRegionLabel } from "@/lib/member-portal/member-muscle-region-filter";
import { memberLibraryRegionModule } from "@/lib/member-portal/muscle-region-registry";
import type { ChestMuscleRegion } from "@/lib/member-portal/chest-muscle-regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  memberLibraryGroupLabel,
  type MemberLibraryMuscleFilter,
} from "@/lib/member-portal/member-library-muscle-groups";
import {
  appendMemberLibraryBrowseItems,
  deriveMemberLibraryListLoad,
  shouldApplyMemberLibraryBrowseResult,
  shouldClearMemberLibraryBrowseLoading,
} from "@/lib/member-portal/member-library-list-load";
import { isMemberLibraryRegionBrowseCursor } from "@/lib/workout-tracking/member-library-region-browse-cursor";
import { resolveMemberLibraryView } from "@/lib/member-portal/member-library-view";
import {
  memberPersonalWorkoutEditorHref,
  memberWorkoutPageHref,
  syncMemberWorkoutPageUrl,
} from "@/lib/member-portal/member-workout-tab-url";
import type { MemberCatalogListItem } from "@/lib/workout-tracking/member-catalog-exercises";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 280;

type MemberExerciseLibraryPanelProps = {
  className?: string;
  addToWorkoutId?: string | null;
  initialGroup?: MemberLibraryMuscleFilter | null;
  initialLibraryRegion?: string | null;
  initialBrowseAllInGroup?: boolean;
  /** @deprecated Use initialLibraryRegion */
  initialChestRegion?: ChestMuscleRegion | null;
  /** @deprecated Use initialBrowseAllInGroup */
  initialChestBrowseAll?: boolean;
  /** Multi-select picker for adding exercises to a personal workout. */
  selectionMode?: boolean;
  doneHref?: string | null;
};

export function MemberExerciseLibraryPanel({
  className,
  addToWorkoutId = null,
  initialGroup = null,
  initialLibraryRegion = null,
  initialBrowseAllInGroup = false,
  initialChestRegion = null,
  initialChestBrowseAll = false,
  selectionMode = false,
  doneHref = null,
}: MemberExerciseLibraryPanelProps) {
  const router = useRouter();
  const workoutId = addToWorkoutId?.trim() ?? "";
  const pickFlow = selectionMode && workoutId.length > 0;

  const [activeGroup, setActiveGroup] =
    React.useState<MemberLibraryMuscleFilter | null>(initialGroup);
  const [activeRegion, setActiveRegion] = React.useState<string | null>(
    initialLibraryRegion ?? initialChestRegion ?? null,
  );
  const [browseAllInGroup, setBrowseAllInGroup] = React.useState(
    initialBrowseAllInGroup || initialChestBrowseAll,
  );
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [items, setItems] = React.useState<MemberCatalogListItem[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const searchSeqRef = React.useRef(0);

  React.useEffect(() => {
    setActiveGroup(initialGroup);
    setActiveRegion(initialLibraryRegion ?? initialChestRegion ?? null);
    setBrowseAllInGroup(initialBrowseAllInGroup || initialChestBrowseAll);
  }, [
    initialGroup,
    initialLibraryRegion,
    initialBrowseAllInGroup,
    initialChestRegion,
    initialChestBrowseAll,
  ]);

  React.useEffect(() => {
    const handle = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(handle);
  }, [query]);

  const listLoad = React.useMemo(
    () =>
      deriveMemberLibraryListLoad({
        activeGroup,
        activeRegion,
        browseAllInGroup,
        debouncedQuery,
      }),
    [activeGroup, activeRegion, browseAllInGroup, debouncedQuery],
  );
  const {
    debouncedQuery: listQuery,
    catalogMuscleGroup,
    catalogFullBody,
    catalogCardio,
    libraryRegion: listLibraryRegion,
    libraryGroup: listLibraryGroup,
  } = listLoad.params;
  const browsingList = listLoad.shouldLoadList;

  const libraryView = resolveMemberLibraryView({
    activeGroup,
    activeRegion,
    browseAllInGroup,
    debouncedQuery,
  });
  const regionModule = memberLibraryRegionModule(activeGroup);
  const showMuscleGroups = libraryView === "muscle-groups";
  const showRegionPicker = libraryView === "region-picker";

  const loadPage = React.useCallback(
    async (opts: {
      reset: boolean;
      startAfterId?: string | null;
      seq: number;
    }) => {
      const deliverPage = async (reset: boolean, startAfterId: string | null) => {
        const result = await browseMemberExerciseLibraryAction({
          query: listQuery || undefined,
          muscleGroup: catalogMuscleGroup,
          fullBody: catalogFullBody || undefined,
          cardio: catalogCardio || undefined,
          libraryRegion: listLibraryRegion,
          chestRegion:
            listLibraryGroup === "CHEST"
              ? (listLibraryRegion as ChestMuscleRegion | null)
              : null,
          startAfterId,
        });
        if (
          !shouldApplyMemberLibraryBrowseResult(opts.seq, searchSeqRef.current)
        ) {
          return false;
        }
        if (!result.ok || !result.data) {
          return false;
        }
        const page = result.data;
        setItems((prev) =>
          reset ? page.items : appendMemberLibraryBrowseItems(prev, page.items),
        );
        if (
          listLibraryRegion &&
          page.nextCursor &&
          !isMemberLibraryRegionBrowseCursor(page.nextCursor)
        ) {
          setCursor(null);
          setHasMore(false);
          return true;
        }
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
        return true;
      };

      const rawContinuation = opts.startAfterId?.trim() || null;
      if (
        listLibraryRegion &&
        rawContinuation &&
        !isMemberLibraryRegionBrowseCursor(rawContinuation)
      ) {
        toast.error(
          "Could not continue this list. Reloading exercises for this region.",
        );
        await deliverPage(true, null);
        return;
      }

      const result = await browseMemberExerciseLibraryAction({
        query: listQuery || undefined,
        muscleGroup: catalogMuscleGroup,
        fullBody: catalogFullBody || undefined,
        cardio: catalogCardio || undefined,
        libraryRegion: listLibraryRegion,
        chestRegion:
          listLibraryGroup === "CHEST"
            ? (listLibraryRegion as ChestMuscleRegion | null)
            : null,
        startAfterId: rawContinuation,
      });
      if (
        !shouldApplyMemberLibraryBrowseResult(opts.seq, searchSeqRef.current)
      ) {
        return;
      }
      if (!result.ok || !result.data) {
        const message = !result.ok ? result.error : "Could not load exercises.";
        toast.error(message);
        if (listLibraryRegion && rawContinuation && !opts.reset) {
          setCursor(null);
          setHasMore(false);
          setLoadingMore(false);
          await deliverPage(true, null);
          return;
        }
        if (opts.reset) {
          setItems([]);
          setCursor(null);
          setHasMore(false);
        }
        return;
      }
      const page = result.data;
      setItems((prev) =>
        opts.reset
          ? page.items
          : appendMemberLibraryBrowseItems(prev, page.items),
      );
      if (
        listLibraryRegion &&
        page.nextCursor &&
        !isMemberLibraryRegionBrowseCursor(page.nextCursor)
      ) {
        setCursor(null);
        setHasMore(false);
        return;
      }
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    },
    [
      listQuery,
      catalogMuscleGroup,
      catalogFullBody,
      catalogCardio,
      listLibraryRegion,
      listLibraryGroup,
    ],
  );

  React.useEffect(() => {
    if (!browsingList) return;
    const seq = ++searchSeqRef.current;
    setCursor(null);
    setHasMore(false);
    setItems([]);
    setLoading(true);
    void loadPage({ reset: true, startAfterId: null, seq }).finally(() => {
      if (shouldClearMemberLibraryBrowseLoading(seq, searchSeqRef.current)) {
        setLoading(false);
      }
    });
  }, [
    browsingList,
    listQuery,
    catalogMuscleGroup,
    catalogFullBody,
    catalogCardio,
    listLibraryRegion,
    listLibraryGroup,
    loadPage,
  ]);

  const editorDoneHref =
    doneHref?.trim() ||
    (workoutId ? memberPersonalWorkoutEditorHref(workoutId) : null);

  function selectGroup(group: MemberLibraryMuscleFilter) {
    setActiveGroup(group);
    setActiveRegion(null);
    setBrowseAllInGroup(false);
    setQuery("");
    syncMemberWorkoutPageUrl({
      tab: "library",
      addTo: addToWorkoutId,
      group,
      libraryRegion: null,
      browseAllInGroup: null,
    });
  }

  function selectLibraryRegion(regionId: string) {
    if (!activeGroup) return;
    setActiveRegion(regionId);
    setBrowseAllInGroup(false);
    setQuery("");
    syncMemberWorkoutPageUrl({
      tab: "library",
      addTo: addToWorkoutId,
      group: activeGroup,
      libraryRegion: regionId,
      browseAllInGroup: null,
    });
  }

  function browseAllInActiveGroup() {
    if (!activeGroup) return;
    setActiveRegion(null);
    setBrowseAllInGroup(true);
    setQuery("");
    syncMemberWorkoutPageUrl({
      tab: "library",
      addTo: addToWorkoutId,
      group: activeGroup,
      libraryRegion: null,
      browseAllInGroup: true,
    });
  }

  function clearGroup() {
    setActiveGroup(null);
    setActiveRegion(null);
    setBrowseAllInGroup(false);
    setQuery("");
    syncMemberWorkoutPageUrl({
      tab: "library",
      addTo: addToWorkoutId,
      group: null,
      libraryRegion: null,
      browseAllInGroup: null,
    });
  }

  function onBack() {
    if (
      activeGroup &&
      regionModule &&
      (activeRegion || browseAllInGroup)
    ) {
      setActiveRegion(null);
      setBrowseAllInGroup(false);
      setQuery("");
      syncMemberWorkoutPageUrl({
        tab: "library",
        addTo: addToWorkoutId,
        group: activeGroup,
        libraryRegion: null,
        browseAllInGroup: null,
      });
      return;
    }
    clearGroup();
  }

  function listTitle(): string {
    if (debouncedQuery) return `Search: ${debouncedQuery}`;
    if (activeGroup && activeRegion) {
      return memberLibraryRegionLabel(activeGroup, activeRegion);
    }
    if (activeGroup) return memberLibraryGroupLabel(activeGroup);
    return "Exercises";
  }

  function toggleSelect(catalogId: string) {
    setSelectedIds((prev) =>
      prev.includes(catalogId)
        ? prev.filter((id) => id !== catalogId)
        : [...prev, catalogId],
    );
  }

  async function onLoadMore() {
    if (!hasMore || !cursor || loadingMore) return;
    if (
      listLibraryRegion &&
      !isMemberLibraryRegionBrowseCursor(cursor)
    ) {
      toast.error(
        "Could not continue this list. Reloading exercises for this region.",
      );
      const seq = ++searchSeqRef.current;
      setLoading(true);
      void loadPage({ reset: true, startAfterId: null, seq }).finally(() => {
        if (shouldClearMemberLibraryBrowseLoading(seq, searchSeqRef.current)) {
          setLoading(false);
        }
      });
      return;
    }
    setLoadingMore(true);
    const seq = searchSeqRef.current;
    try {
      await loadPage({ reset: false, startAfterId: cursor, seq });
    } finally {
      setLoadingMore(false);
    }
  }

  async function onAddSelected() {
    if (!pickFlow || submitting || selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const result = await addExercisesToPersonalWorkoutAction({
        workoutId,
        catalogIds: selectedIds,
      });
      if (!result.ok || !result.data) {
        toast.error(!result.ok ? result.error : "Could not add exercises.");
        return;
      }
      const count = result.data.addedCount;
      toast.success(
        count === 1
          ? "1 exercise added to your workout."
          : `${count} exercises added to your workout.`,
      );
      router.push(memberPersonalWorkoutEditorHref(workoutId));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCount = selectedIds.length;

  return (
    <div
      className={cn("space-y-4", pickFlow && "pb-28", className)}
    >
      {pickFlow ? (
        <div
          className="member-workout-card flex flex-wrap items-center justify-between gap-2 border-primary/25 bg-primary/5 px-3 py-2.5 text-sm"
        >
          <p className="min-w-0 text-muted-foreground">
            Select exercises, then add them to your workout.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {editorDoneHref ? (
              <Link
                href={editorDoneHref}
                className="rounded-lg border border-border/80 px-3 py-1.5 text-sm font-semibold text-foreground"
              >
                Back to editor
              </Link>
            ) : null}
            {editorDoneHref ? (
              <Link
                href={editorDoneHref}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                Done
              </Link>
            ) : null}
          </div>
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

      {showMuscleGroups ? (
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
      ) : showRegionPicker && activeGroup ? (
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
                {regionModule?.pickerTitle ??
                  memberLibraryGroupLabel(activeGroup)}
              </h2>
              <p className="text-xs text-muted-foreground">
                {regionModule?.pickerSubtitle ?? ""}
              </p>
            </div>
          </div>
          <MemberMuscleRegionGrid
            group={activeGroup}
            onSelect={selectLibraryRegion}
            onBrowseAll={browseAllInActiveGroup}
          />
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card/80"
              aria-label="Back to muscle groups"
              onClick={() => onBack()}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="font-display truncate text-lg font-bold">
                {listTitle()}
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
                  libraryRegion={activeRegion}
                  selectionMode={selectionMode}
                  multiSelect={pickFlow}
                  selected={selectedIds.includes(item.catalogId)}
                  onToggleSelect={toggleSelect}
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

      {pickFlow ? (
        <div
          className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-border/80 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm"
        >
          <p className="mb-2 text-center text-xs text-muted-foreground">
            {selectedCount === 0
              ? "Select one or more exercises to add."
              : `${selectedCount} selected`}
          </p>
          <Button
            type="button"
            className="h-12 w-full text-base"
            disabled={selectedCount === 0 || submitting}
            onClick={() => void onAddSelected()}
          >
            {submitting
              ? "Adding…"
              : selectedCount === 0
                ? "Add exercises"
                : `Add ${selectedCount} exercise${selectedCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
