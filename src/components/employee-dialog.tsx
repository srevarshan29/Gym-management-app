"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { createEmployee, updateEmployee } from "@/app/actions/employees";
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
import { Textarea } from "@/components/ui/textarea";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";

export type EmployeeInput = {
  id: string;
  name: string;
  phone: string;
  position: string;
  joiningDate: string;
  salary: number | null;
  notes: string | null;
};

function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function EmployeeDialog({
  employee,
  trigger,
}: {
  employee?: EmployeeInput;
  trigger?: React.ReactNode;
}) {
  const isEdit = Boolean(employee);
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const action = isEdit ? updateEmployee : createEmployee;
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
              <Plus className="h-4 w-4" /> Add employee
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
            <DialogDescription>
              HR record for someone who works at your gym. This is separate from
              app login accounts under Admins.
            </DialogDescription>
          </DialogHeader>

          {employee ? <input type="hidden" name="id" value={employee.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="employee-name">Name</Label>
            <Input
              id="employee-name"
              name="name"
              defaultValue={employee?.name}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-phone">Phone</Label>
            <Input
              id="employee-phone"
              name="phone"
              defaultValue={employee?.phone}
              placeholder="+91 98765 43210"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-position">Position</Label>
            <Input
              id="employee-position"
              name="position"
              defaultValue={employee?.position}
              placeholder="e.g. Trainer, Front Desk, Cleaner"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-joiningDate">Joining date</Label>
            <Input
              id="employee-joiningDate"
              name="joiningDate"
              type="date"
              defaultValue={
                employee
                  ? toDateInputValue(employee.joiningDate)
                  : todayDateInputValue()
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-salary">Salary (optional)</Label>
            <Input
              id="employee-salary"
              name="salary"
              type="number"
              min={0}
              step="0.01"
              defaultValue={
                employee?.salary != null ? String(employee.salary) : ""
              }
              placeholder="Monthly amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-notes">Notes (optional)</Label>
            <Textarea
              id="employee-notes"
              name="notes"
              defaultValue={employee?.notes ?? ""}
              placeholder="Shift preferences, emergency contact, etc."
            />
          </div>

          <DialogFooter>
            <SubmitButton label={isEdit ? "Save changes" : "Add employee"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
