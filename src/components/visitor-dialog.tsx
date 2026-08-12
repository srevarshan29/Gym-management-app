"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { createVisitor, updateVisitor } from "@/app/actions/visitors";
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
import type { VisitorStatus } from "@prisma/client";

import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";

export type VisitorInput = {
  id: string;
  name: string;
  phone: string;
  visitDate: string;
  notes: string | null;
  status: VisitorStatus;
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

export function VisitorDialog({
  visitor,
  trigger,
}: {
  visitor?: VisitorInput;
  trigger?: React.ReactNode;
}) {
  const isEdit = Boolean(visitor);
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const action = isEdit ? updateVisitor : createVisitor;
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
              <Plus className="h-4 w-4" /> Log visitor
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit visitor" : "Log visitor"}</DialogTitle>
            <DialogDescription>
              Record a walk-in or trial visit. Visitors are separate from full
              members.
            </DialogDescription>
          </DialogHeader>

          {visitor ? <input type="hidden" name="id" value={visitor.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="visitor-name">Name</Label>
            <Input
              id="visitor-name"
              name="name"
              defaultValue={visitor?.name}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitor-phone">Phone number</Label>
            <Input
              id="visitor-phone"
              name="phone"
              defaultValue={visitor?.phone}
              placeholder="+91 98765 43210"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitor-visitDate">Visit date</Label>
            <Input
              id="visitor-visitDate"
              name="visitDate"
              type="date"
              defaultValue={
                visitor
                  ? toDateInputValue(visitor.visitDate)
                  : todayDateInputValue()
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitor-notes">Notes / action taken</Label>
            <Textarea
              id="visitor-notes"
              name="notes"
              defaultValue={visitor?.notes ?? ""}
              placeholder="e.g. Trial class, toured facility, follow up needed"
            />
          </div>

          <DialogFooter>
            <SubmitButton label={isEdit ? "Save changes" : "Log visitor"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
