"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { createGym } from "@/app/actions/gyms";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGuardedFormAction } from "@/hooks/use-guarded-form-action";
import type { ActionResult } from "@/lib/action-result";

type GymRow = {
  id: string;
  name: string;
  createdAtLabel: string;
  ownerName: string | null;
  ownerEmail: string | null;
  memberCount: number;
  staffCount: number;
};

export function GymManager({ gyms }: { gyms: GymRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateGymDialog />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gym</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gyms.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                No gyms yet. Click &quot;Add gym&quot; to provision the first one.
              </TableCell>
            </TableRow>
          ) : (
            gyms.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>
                  {g.ownerName ? (
                    <div>
                      <div>{g.ownerName}</div>
                      <div className="text-xs text-muted-foreground">{g.ownerEmail}</div>
                    </div>
                  ) : (
                    <Badge variant="secondary">No owner</Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono">{g.memberCount}</TableCell>
                <TableCell className="font-mono">{g.staffCount}</TableCell>
                <TableCell className="font-mono text-muted-foreground">{g.createdAtLabel}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function CreateSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create gym"}
    </Button>
  );
}

function CreateGymDialog() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const guardedAction = useGuardedFormAction(createGym);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    guardedAction,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Gym created.");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1">
          <Plus className="h-4 w-4" /> Add gym
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Provision a new gym</DialogTitle>
            <DialogDescription>
              Creates a new tenant and its first owner account. The owner
              logs in with the credentials below and can invite their own
              staff from Settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="gym-name">Gym name</Label>
            <Input id="gym-name" name="gymName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-name">Owner name</Label>
            <Input id="owner-name" name="ownerName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-email">Owner email</Label>
            <Input id="owner-email" name="ownerEmail" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-password">Owner temporary password</Label>
            <Input
              id="owner-password"
              name="ownerPassword"
              type="text"
              placeholder="At least 8 characters"
              required
            />
          </div>

          <DialogFooter>
            <CreateSubmit />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
