"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteWorkoutPlan } from "@/app/actions/workout-plans";
import {
  WorkoutPlanDialog,
  type WorkoutPlanInput,
} from "@/components/workout-plan-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MemberOption } from "@/lib/programme-types";
import { workoutLevelLabel, WORKOUT_LEVELS } from "@/lib/workout-level";

type WorkoutPlansListProps = {
  plans: WorkoutPlanInput[];
  members: MemberOption[];
  canManage: boolean;
};

function matchesSearch(plan: WorkoutPlanInput, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return plan.memberName.toLowerCase().includes(q);
}

function DeleteWorkoutPlanButton({
  id,
  memberName,
}: {
  id: string;
  memberName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteWorkoutPlan(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Workout plan deleted.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete workout plan</DialogTitle>
          <DialogDescription>
            Remove the workout plan for {memberName}? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onDelete} disabled={pending}>
            {pending ? "Deleting..." : "Delete plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WorkoutPlansList({
  plans,
  members,
  canManage,
}: WorkoutPlansListProps) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => plans.filter((plan) => matchesSearch(plan, query)),
    [plans, query],
  );

  const assignedMemberIds = React.useMemo(
    () => new Set(plans.map((plan) => plan.memberId)),
    [plans],
  );
  const eligibleMembers = React.useMemo(
    () => members.filter((member) => !assignedMemberIds.has(member.id)),
    [members, assignedMemberIds],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative w-full max-w-md sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by member name…"
            className="pl-9"
            aria-label="Search workout plans"
          />
        </div>
      </div>

      <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
        <CardContent className="p-0">
          {plans.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No workout plans yet.
                {canManage
                  ? " Add a plan to assign a training programme to a member."
                  : ""}
              </p>
              {canManage ? (
                <div className="mt-4">
                  <WorkoutPlanDialog members={eligibleMembers} />
                </div>
              ) : null}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No plans match your search.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan title</TableHead>
                  <TableHead>Level</TableHead>
                  {canManage ? (
                    <TableHead className="text-right">Actions</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((plan) => (
                  <TableRow key={plan.id} className="hover-lift-row">
                    <TableCell className="min-w-[120px] font-medium">
                      {plan.memberName}
                    </TableCell>
                    <TableCell>{plan.title}</TableCell>
                    <TableCell>{workoutLevelLabel(plan.level)}</TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <WorkoutPlanDialog
                            plan={plan}
                            members={eligibleMembers}
                            trigger={
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            }
                          />
                          <DeleteWorkoutPlanButton
                            id={plan.id}
                            memberName={plan.memberName}
                          />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
