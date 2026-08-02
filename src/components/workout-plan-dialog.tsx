"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import type { WorkoutLevel } from "@prisma/client";

import { createWorkoutPlan, updateWorkoutPlan } from "@/app/actions/workout-plans";
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
import { Textarea } from "@/components/ui/textarea";
import type { MemberOption } from "@/lib/programme-types";
import { workoutLevelLabel, WORKOUT_LEVELS } from "@/lib/workout-level";
import type { ActionResult } from "@/lib/action-result";

export type WorkoutPlanInput = {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  level: WorkoutLevel;
  weeklySchedule: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function WorkoutPlanDialog({
  plan,
  members,
  trigger,
}: {
  plan?: WorkoutPlanInput;
  members: MemberOption[];
  trigger?: React.ReactNode;
}) {
  const isEdit = Boolean(plan);
  const [open, setOpen] = React.useState(false);
  const [memberId, setMemberId] = React.useState(plan?.memberId ?? "");
  const [level, setLevel] = React.useState<WorkoutLevel>(
    plan?.level ?? "BEGINNER",
  );
  const router = useRouter();

  const action = isEdit ? updateWorkoutPlan : createWorkoutPlan;
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    action,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Saved.");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  React.useEffect(() => {
    if (open && plan) {
      setMemberId(plan.memberId);
      setLevel(plan.level);
    }
    if (open && !plan && members.length === 1) {
      setMemberId(members[0]!.id);
    }
  }, [open, plan, members]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ??
          (isEdit ? (
            <Button variant="ghost" size="sm" className="gap-1">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          ) : (
            <Button className="gap-1">
              <Plus className="h-4 w-4" /> Add plan
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit workout plan" : "Add workout plan"}
            </DialogTitle>
            <DialogDescription>
              Assign a training programme to a member. Each member can have one
              active workout plan.
            </DialogDescription>
          </DialogHeader>

          {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="level" value={level} />

          <div className="space-y-2">
            <Label>Member</Label>
            {isEdit ? (
              <p className="text-sm font-medium">{plan!.memberName}</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All members already have a workout plan.
              </p>
            ) : (
              <Select value={memberId} onValueChange={setMemberId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="workout-title">Plan title</Label>
            <Input
              id="workout-title"
              name="title"
              defaultValue={plan?.title}
              placeholder="e.g. Full-body strength"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Level</Label>
            <Select
              value={level}
              onValueChange={(value) => setLevel(value as WorkoutLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKOUT_LEVELS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {workoutLevelLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workout-schedule">Weekly schedule</Label>
            <Textarea
              id="workout-schedule"
              name="weeklySchedule"
              defaultValue={plan?.weeklySchedule ?? ""}
              placeholder="Mon: Upper body&#10;Wed: Lower body&#10;Fri: Cardio + core"
              rows={6}
              required
            />
          </div>

          <DialogFooter>
            <SubmitButton
              label={isEdit ? "Save changes" : "Add plan"}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
