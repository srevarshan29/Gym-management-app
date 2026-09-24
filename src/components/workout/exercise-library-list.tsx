"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Trash2 } from "lucide-react";

import type { Role } from "@prisma/client";

import { refreshExerciseFromCatalog } from "@/app/actions/catalog";
import { deleteExercise } from "@/app/actions/exercises";
import { ExerciseMedia } from "@/components/exercise-media";
import { EditExerciseDefaultsDialog } from "@/components/workout/edit-exercise-defaults-dialog";
import { useActionLock } from "@/hooks/use-action-lock";
import {
  canDeleteLibraryExercise,
  canEditExerciseDefaults,
  isCatalogLinkedExercise,
} from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { muscleGroupLabel } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/muscle-groups";
import type { ExerciseListItem } from "@/lib/workout-tracking/types";

type ExerciseLibraryListProps = {
  items: ExerciseListItem[];
  userRole: Role;
  canManage: boolean;
  canRefreshCatalog: boolean;
  canUploadMedia: boolean;
};

function sourceBadge(item: ExerciseListItem) {
  switch (item.exerciseSource) {
    case "SEEDED":
      return <Badge variant="secondary">Starter</Badge>;
    case "CATALOG":
      return <Badge variant="outline">Catalog</Badge>;
    default:
      return <Badge variant="outline">Custom</Badge>;
  }
}

export function ExerciseLibraryList({
  items,
  userRole,
  canManage,
  canRefreshCatalog,
  canUploadMedia,
}: ExerciseLibraryListProps) {
  const router = useRouter();
  const { run, isPending: actionPending } = useActionLock();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const sections = items.reduce<{ label: string; items: ExerciseListItem[] }[]>(
    (acc, item) => {
      const label = muscleGroupLabel(item.muscleGroup as MuscleGroup);
      const last = acc[acc.length - 1];
      if (last?.label === label) {
        last.items.push(item);
      } else {
        acc.push({ label, items: [item] });
      }
      return acc;
    },
    [],
  );

  async function onDelete(id: string) {
    if (actionPending) return;
    setPendingId(id);
    await run(async () => {
      try {
        const result = await deleteExercise(id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(result.message ?? "Exercise removed.");
        router.refresh();
      } catch (error) {
        console.error("[exercises] deleteExercise failed:", error);
        toast.error("Could not delete exercise. Please try again.");
      } finally {
        setPendingId(null);
      }
    });
  }

  async function onRefresh(id: string) {
    if (actionPending) return;
    setPendingId(id);
    await run(async () => {
      try {
        const result = await refreshExerciseFromCatalog(id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(result.message ?? "Exercise refreshed.");
        router.refresh();
      } catch (error) {
        console.error("[catalog] refreshExerciseFromCatalog failed:", error);
        toast.error("Could not refresh exercise from catalog.");
      } finally {
        setPendingId(null);
      }
    });
  }

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No exercises in the library yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.label}>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h2 className="font-display text-sm font-semibold">{section.label}</h2>
            </div>
            <ul className="divide-y">
              {section.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <ExerciseMedia
                      media={item.media}
                      alt={`${item.name} demonstration`}
                      variant="thumbnail"
                      compact
                      className="h-14 w-14 shrink-0"
                      emptyLabel=""
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        {sourceBadge(item)}
                        {item.hasMedia ? (
                          <Badge variant="outline" className="text-[10px]">
                            Demo image
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            No demo image
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.defaultSets ? `${item.defaultSets} sets` : "—"}
                        {item.defaultReps ? ` · ${item.defaultReps} reps` : ""}
                        {item.importedCatalogVersion
                          ? ` · Catalog v${item.importedCatalogVersion}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {canManage ? (
                    <div className="flex flex-col gap-1 sm:items-end">
                      {canEditExerciseDefaults(userRole, item) ||
                      canDeleteLibraryExercise(userRole, item) ||
                      (canRefreshCatalog && item.exerciseSource === "CATALOG") ? (
                        <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                          {canEditExerciseDefaults(userRole, item) ? (
                            <EditExerciseDefaultsDialog
                              exercise={item}
                              canUploadMedia={canUploadMedia}
                            />
                          ) : null}
                          {canRefreshCatalog && isCatalogLinkedExercise(item) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              disabled={pendingId === item.id}
                              onClick={() => onRefresh(item.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                              Refresh
                            </Button>
                          ) : null}
                          {canDeleteLibraryExercise(userRole, item) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={pendingId === item.id}
                              onClick={() => onDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      ) : isCatalogLinkedExercise(item) ? (
                        <p className="text-xs text-muted-foreground sm:text-right">
                          Catalog exercise — only owners and admins can edit or remove.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
