"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { deleteExercise } from "@/app/actions/exercises";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ExerciseListItem } from "@/lib/workout-tracking/types";

type ExerciseLibraryListProps = {
  grouped: Record<string, ExerciseListItem[]>;
  canManage: boolean;
};

export function ExerciseLibraryList({
  grouped,
  canManage,
}: ExerciseLibraryListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function onDelete(id: string) {
    setPendingId(id);
    const result = await deleteExercise(id);
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "Exercise removed.");
    router.refresh();
  }

  const groups = Object.keys(grouped).sort();

  if (groups.length === 0) {
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
      {groups.map((group) => (
        <Card key={group}>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3">
              <h2 className="font-display text-sm font-semibold">{group}</h2>
            </div>
            <ul className="divide-y">
              {grouped[group]!.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.defaultSets ? `${item.defaultSets} sets` : "—"}
                      {item.defaultReps ? ` · ${item.defaultReps} reps` : ""}
                      {item.isSeeded ? " · Starter" : " · Custom"}
                    </p>
                  </div>
                  {canManage && !item.isSeeded ? (
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
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
