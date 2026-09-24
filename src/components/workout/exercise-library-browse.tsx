"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { Role } from "@prisma/client";

import { browseExerciseLibraryAction } from "@/app/actions/exercises";
import { ExerciseLibraryList } from "@/components/workout/exercise-library-list";
import { Button } from "@/components/ui/button";
import type { ExerciseListItem } from "@/lib/workout-tracking/types";

type ExerciseLibraryBrowseProps = {
  initialItems: ExerciseListItem[];
  initialNextCursor: string | null;
  totalCount: number;
  userRole: Role;
  canManage: boolean;
  canRefreshCatalog: boolean;
  canUploadMedia: boolean;
};

export function ExerciseLibraryBrowse({
  initialItems,
  initialNextCursor,
  totalCount,
  userRole,
  canManage,
  canRefreshCatalog,
  canUploadMedia,
}: ExerciseLibraryBrowseProps) {
  const [items, setItems] = React.useState(initialItems);
  const [nextCursor, setNextCursor] = React.useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    setItems(initialItems);
    setNextCursor(initialNextCursor);
  }, [initialItems, initialNextCursor]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const result = await browseExerciseLibraryAction({
        startAfterId: nextCursor,
      });

      if (!result.ok || !result.data) {
        toast.error(result.ok ? "Could not load more exercises." : result.error);
        return;
      }

      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        const appended = result.data!.items.filter((item) => !seen.has(item.id));
        return [...current, ...appended];
      });
      setNextCursor(result.data.nextCursor);
    } catch (error) {
      console.error("[exercises] browseExerciseLibraryAction failed:", error);
      toast.error("Could not load more exercises.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {totalCount} exercise{totalCount === 1 ? "" : "s"} in your gym library.
          {items.length < totalCount
            ? ` Showing ${items.length} loaded alphabetically.`
            : " Sorted alphabetically by name."}
        </p>
        <p className="text-xs text-muted-foreground">
          Muscle group headings reflect consecutive exercises in this sorted list, not
          complete muscle-group sections.
        </p>
      </div>

      <ExerciseLibraryList
        items={items}
        userRole={userRole}
        canManage={canManage}
        canRefreshCatalog={canRefreshCatalog}
        canUploadMedia={canUploadMedia}
      />

      {nextCursor ? (
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Load more exercises"
          )}
        </Button>
      ) : null}
    </div>
  );
}
