"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Loader2, Search } from "lucide-react";

import {
  browseExerciseCatalogAction,
  importCatalogExercises,
} from "@/app/actions/catalog";
import { ExerciseMedia } from "@/components/exercise-media";
import { useActionLock } from "@/hooks/use-action-lock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogBrowseItem } from "@/lib/catalog/catalog-browse-types";
import { AsyncRequestSequence } from "@/lib/async/request-sequence";
import { muscleGroupLabel, MUSCLE_GROUP_OPTIONS } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/muscle-groups";

type CatalogBrowserProps = {
  canImport: boolean;
};

export function CatalogBrowser({ canImport }: CatalogBrowserProps) {
  const router = useRouter();
  const { run, isPending } = useActionLock();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [muscleGroup, setMuscleGroup] = React.useState<string>("ALL");
  const [items, setItems] = React.useState<CatalogBrowseItem[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const requestSeq = React.useRef(new AsyncRequestSequence());
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadPage = React.useCallback(
    async (options: { append?: boolean; startAfterId?: string | null } = {}) => {
      const append = options.append ?? false;
      const requestId = append
        ? requestSeq.current.current()
        : requestSeq.current.start();
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const result = await browseExerciseCatalogAction({
          query: debouncedQuery || undefined,
          muscleGroup: muscleGroup === "ALL" ? null : (muscleGroup as MuscleGroup),
          startAfterId: append ? (options.startAfterId ?? nextCursor) : null,
          limit: 25,
        });

        if (!mountedRef.current || !requestSeq.current.isCurrent(requestId)) {
          return;
        }

        if (!result.ok || !result.data) {
          toast.error(result.ok ? "Could not load catalog." : result.error);
          return;
        }

        setItems((current) => {
          if (!append) return result.data!.items;
          const seen = new Set(current.map((item) => item.catalogId));
          const appended = result.data!.items.filter(
            (item) => !seen.has(item.catalogId),
          );
          return [...current, ...appended];
        });
        setNextCursor(result.data.nextCursor);
        setHasMore(result.data.hasMore);
        if (!append) setSelected(new Set());
      } catch (error) {
        if (!mountedRef.current || !requestSeq.current.isCurrent(requestId)) {
          return;
        }
        console.error("[catalog] browseExerciseCatalogAction failed:", error);
        toast.error("Could not load exercise catalog.");
      } finally {
        if (!mountedRef.current || !requestSeq.current.isCurrent(requestId)) {
          return;
        }
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedQuery, muscleGroup, nextCursor],
  );

  React.useEffect(() => {
    void loadPage();
  }, [debouncedQuery, muscleGroup]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSelected(catalogId: string, disabled: boolean) {
    if (disabled) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(catalogId)) next.delete(catalogId);
      else next.add(catalogId);
      return next;
    });
  }

  async function onImport() {
    if (!canImport || selected.size === 0 || isPending) return;

    await run(async () => {
      try {
        const result = await importCatalogExercises([...selected]);
        if (!result.ok || !result.data) {
          toast.error(result.ok ? "Import failed." : result.error);
          return;
        }

        const { summary } = result.data;
        const parts = [
          summary.imported ? `${summary.imported} imported` : null,
          summary.alreadyImported ? `${summary.alreadyImported} already in library` : null,
          summary.unavailable ? `${summary.unavailable} unavailable` : null,
          summary.invalid ? `${summary.invalid} invalid` : null,
        ].filter(Boolean);

        if (summary.imported > 0) {
          toast.success(parts.join(" · ") || result.message);
        } else {
          toast.message(parts.join(" · ") || result.message);
        }

        setSelected(new Set());
        router.refresh();
        await loadPage();
      } catch (error) {
        console.error("[catalog] importCatalogExercises failed:", error);
        toast.error("Could not import catalog exercises.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <Label htmlFor="catalog-search">Search catalog</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="catalog-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by exercise name"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catalog-group">Muscle group</Label>
              <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                <SelectTrigger id="catalog-group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All groups</SelectItem>
                  {MUSCLE_GROUP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {canImport ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {selected.size} selected
              </p>
              <Button
                type="button"
                onClick={onImport}
                disabled={selected.size === 0 || isPending}
                className="gap-1"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Import selected
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You can browse the catalog. Only owners and admins can import exercises into your gym library.
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading catalog...
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No catalog exercises matched your search.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((item) => {
                const importDisabled = !canImport || item.alreadyImported;
                const checked = selected.has(item.catalogId);
                return (
                  <li
                    key={item.catalogId}
                    className="flex items-start gap-3 px-4 py-3 text-sm"
                  >
                    <ExerciseMedia
                      media={item.media}
                      alt={`${item.name} demonstration`}
                      variant="thumbnail"
                      compact
                      className="mt-0.5 h-14 w-14 shrink-0"
                      emptyLabel=""
                    />
                    {canImport ? (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-input"
                        checked={checked}
                        disabled={importDisabled || isPending}
                        onChange={() => toggleSelected(item.catalogId, importDisabled)}
                        aria-label={`Select ${item.name}`}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        <Badge variant="secondary">
                          {muscleGroupLabel(item.muscleGroup)}
                        </Badge>
                        {item.alreadyImported ? (
                          <Badge>In library</Badge>
                        ) : null}
                        {item.hasMedia ? (
                          <Badge variant="outline">Catalog demo</Badge>
                        ) : (
                          <Badge variant="secondary">No demo image</Badge>
                        )}
                        <Badge variant="outline">Catalog</Badge>
                      </div>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {item.primaryMuscles.join(", ") || "—"}
                        {item.equipment ? ` · ${item.equipment}` : ""}
                        {item.difficulty ? ` · ${item.difficulty}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {hasMore && nextCursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={loadingMore}
            onClick={() => void loadPage({ append: true, startAfterId: nextCursor })}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : !loading && items.length > 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          End of catalog results.
        </p>
      ) : null}
    </div>
  );
}
