"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { createDietPlan, updateDietPlan } from "@/app/actions/diet-plans";
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
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";

export type DietPlanInput = {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  caloriesPerDay: number;
  mealPlan: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function DietPlanDialog({
  plan,
  members,
  trigger,
}: {
  plan?: DietPlanInput;
  members: MemberOption[];
  trigger?: React.ReactNode;
}) {
  const isEdit = Boolean(plan);
  const [open, setOpen] = React.useState(false);
  const [memberId, setMemberId] = React.useState(plan?.memberId ?? "");
  const router = useRouter();

  const action = isEdit ? updateDietPlan : createDietPlan;
  const guardedAction = useGuardedFormAction(action);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
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
            <DialogTitle>{isEdit ? "Edit diet plan" : "Add diet plan"}</DialogTitle>
            <DialogDescription>
              Assign nutrition guidance to a member. Each member can have one
              active diet plan.
            </DialogDescription>
          </DialogHeader>

          {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
          <input type="hidden" name="memberId" value={memberId} />

          <div className="space-y-2">
            <Label>Member</Label>
            {isEdit ? (
              <p className="text-sm font-medium">{plan!.memberName}</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All members already have a diet plan.
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
            <Label htmlFor="diet-title">Plan title</Label>
            <Input
              id="diet-title"
              name="title"
              defaultValue={plan?.title}
              placeholder="e.g. Lean bulk phase 1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diet-calories">Calories / day</Label>
            <Input
              id="diet-calories"
              name="caloriesPerDay"
              type="number"
              min={1}
              max={10000}
              defaultValue={plan?.caloriesPerDay}
              placeholder="2500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diet-mealPlan">Meal plan</Label>
            <Textarea
              id="diet-mealPlan"
              name="mealPlan"
              defaultValue={plan?.mealPlan ?? ""}
              placeholder="Breakfast: …&#10;Lunch: …&#10;Dinner: …"
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
