"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

import { createPackage, updatePackage } from "@/app/actions/packages";
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
import type { ActionResult } from "@/lib/action-result";

export type PackageInput = {
  id: string;
  name: string;
  price: number;
  durationValue: number;
  durationUnit: "MONTHS" | "DAYS";
  isActive: boolean;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function PackageDialog({ pkg }: { pkg?: PackageInput }) {
  const isEdit = Boolean(pkg);
  const [open, setOpen] = React.useState(false);
  const [unit, setUnit] = React.useState<"MONTHS" | "DAYS">(
    pkg?.durationUnit ?? "MONTHS",
  );
  const [active, setActive] = React.useState(pkg?.isActive ?? true);
  const router = useRouter();

  const action = isEdit ? updatePackage : createPackage;
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="sm" className="gap-1">
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        ) : (
          <Button className="gap-1">
            <Plus className="h-4 w-4" /> New package
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit package" : "New package"}</DialogTitle>
            <DialogDescription>
              Define a membership package with a price and duration.
            </DialogDescription>
          </DialogHeader>

          {pkg ? <input type="hidden" name="id" value={pkg.id} /> : null}
          <input type="hidden" name="durationUnit" value={unit} />
          <input type="hidden" name="isActive" value={active ? "1" : "0"} />

          <div className="space-y-2">
            <Label htmlFor="name">Package name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={pkg?.name}
              placeholder="e.g. Monthly, Quarterly, Annual"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (INR)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={pkg?.price}
                placeholder="1500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationValue">Duration</Label>
              <div className="flex gap-2">
                <Input
                  id="durationValue"
                  name="durationValue"
                  type="number"
                  min="1"
                  defaultValue={pkg?.durationValue ?? 1}
                  className="w-20"
                  required
                />
                <Select
                  value={unit}
                  onValueChange={(v) => setUnit(v as "MONTHS" | "DAYS")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHS">Months</SelectItem>
                    <SelectItem value="DAYS">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active (available to assign to members)
          </label>

          <DialogFooter>
            <SubmitButton label={isEdit ? "Save changes" : "Create package"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
