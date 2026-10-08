"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { browseMemberExerciseLibraryAction } from "@/app/actions/member-exercise-library";
import { Input } from "@/components/ui/input";
import {
  MUSCLE_GROUP_OPTIONS,
  type MuscleGroup,
} from "@/lib/muscle-groups";
import type { MemberCatalogListItem } from "@/lib/workout-tracking/member-catalog-exercises";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 280;

type MemberExerciseLibraryPanelProps = {
  className?: string;
  addToWorkoutId?: string | null;
};

export function MemberExerciseLibraryPanel({
  className,
  addToWorkoutId = null,
}: MemberExerciseLibraryPanelProps) {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [muscleGroup, setMuscleGroup] = React.useState<MuscleGroup | "">("");
  const [items, setItems] = React.useState<MemberCatalogListItem[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const searchSeqRef = React.useRef(0);

  React.useEffect(() => {
    const handle = window.setTimeout(
      () => setDebouncedQuery(query.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(handle);
  }, [query]);

  const loadPage = React.useCallback(
    async (opts: {
      reset: boolean;
      startAfterId?: string | null;
      seq: number;
    }) => {
      const result = await browseMemberExerciseLibraryAction({
        query: debouncedQuery || undefined,
        muscleGroup: muscleGroup || null,
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
    [debouncedQuery, muscleGroup],
  );

  React.useEffect(() => {
    const seq = ++searchSeqRef.current;
    setLoading(true);
    void loadPage({ reset: true, seq }).finally(() => {
      if (seq === searchSeqRef.current) setLoading(false);
    });
  }, [debouncedQuery, muscleGroup, loadPage]);

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
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises"
          className="h-12 pl-9 text-base"
          autoComplete="off"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          className={cn(
            "shrink-0 rounded-full border px-3 py-2 text-sm",
            muscleGroup === ""
              ? "border-primary bg-primary/10"
              : "border-border",
          )}
          onClick={() => setMuscleGroup("")}
        >
          All
        </button>
        {MUSCLE_GROUP_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-sm",
              muscleGroup === opt.value
                ? "border-primary bg-primary/10"
                : "border-border",
            )}
            onClick={() => setMuscleGroup(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No exercises found.
        </p>
      ) : (
        <ul className="divide-y divide-border/70 rounded-xl border">
          {items.map((item) => (
            <li key={item.catalogId}>
              <Link
                href={
                  addToWorkoutId
                    ? `/member/workout/library/${encodeURIComponent(item.catalogId)}?addTo=${encodeURIComponent(addToWorkoutId)}`
                    : `/member/workout/library/${encodeURIComponent(item.catalogId)}`
                }
                className="flex min-h-[72px] items-center gap-3 px-3 py-2 active:bg-muted/50"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.muscleGroup}
                    {item.equipment ? ` · ${item.equipment}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading ? (
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-center rounded-lg border text-sm font-medium"
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
    </div>
  );
}
