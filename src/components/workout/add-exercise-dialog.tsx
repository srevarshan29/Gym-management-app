"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { createExercise } from "@/app/actions/exercises";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";
import { MUSCLE_GROUP_OPTIONS } from "@/lib/exercises";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding..." : "Add exercise"}
    </Button>
  );
}

export function AddExerciseDialog() {
  const [open, setOpen] = React.useState(false);
  const [muscleGroup, setMuscleGroup] = React.useState("CHEST");
  const router = useRouter();
  const guardedAction = useGuardedFormAction(createExercise);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Exercise added.");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1">
          <Plus className="h-4 w-4" /> Add custom exercise
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add custom exercise</DialogTitle>
            <DialogDescription>
              Saved to your gym&apos;s library for reuse in any member plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="exercise-name">Name</Label>
            <Input id="exercise-name" name="name" required placeholder="e.g. Cable Crossover" />
          </div>
          <input type="hidden" name="muscleGroup" value={muscleGroup} />
          <div className="space-y-2">
            <Label htmlFor="exercise-group">Muscle group</Label>
            <Select value={muscleGroup} onValueChange={setMuscleGroup} required>
              <SelectTrigger id="exercise-group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MUSCLE_GROUP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="default-sets">Default sets</Label>
              <Input id="default-sets" name="defaultSets" type="number" min={1} max={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-reps">Default reps</Label>
              <Input id="default-reps" name="defaultReps" placeholder="8-12" />
            </div>
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
