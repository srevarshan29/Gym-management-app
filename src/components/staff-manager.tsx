"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import {
  createStaff,
  updateStaffRole,
  deleteStaff,
} from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionResult } from "@/lib/action-result";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "STAFF";
};

export function StaffManager({
  staff,
  currentUserId,
  currentUserRole,
}: {
  staff: Staff[];
  currentUserId: string;
  currentUserRole: "OWNER" | "ADMIN" | "STAFF";
}) {
  const canAssignOwner = currentUserRole === "OWNER";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateStaffDialog canAssignOwner={canAssignOwner} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                {s.name}
                {s.id === currentUserId ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (you)
                  </span>
                ) : null}
              </TableCell>
              <TableCell>{s.email}</TableCell>
              <TableCell>
                <RoleSelect
                  id={s.id}
                  role={s.role}
                  disabled={s.id === currentUserId}
                  canAssignOwner={canAssignOwner}
                />
              </TableCell>
              <TableCell className="text-right">
                {s.id === currentUserId ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : (
                  <DeleteStaffButton id={s.id} name={s.name} />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RoleSelect({
  id,
  role,
  disabled,
  canAssignOwner,
}: {
  id: string;
  role: string;
  disabled: boolean;
  canAssignOwner: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function onChange(value: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("role", value);
    startTransition(async () => {
      const res = await updateStaffRole(undefined, fd);
      if (res.ok) {
        toast.success(res.message ?? "Role updated.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Select value={role} onValueChange={onChange} disabled={disabled || pending}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {canAssignOwner ? (
          <SelectItem value="OWNER">Owner</SelectItem>
        ) : null}
        <SelectItem value="ADMIN">Admin</SelectItem>
        <SelectItem value="STAFF">Staff</SelectItem>
      </SelectContent>
    </Select>
  );
}

function DeleteStaffButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function onDelete() {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      try {
        await deleteStaff(fd);
        toast.success("Staff account deleted.");
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not delete account.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-destructive">
          <Trash2 className="h-4 w-4" /> Remove
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove staff account</DialogTitle>
          <DialogDescription>
            Remove {name}? They will no longer be able to sign in.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={pending}
          >
            {pending ? "Removing..." : "Remove account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create account"}
    </Button>
  );
}

function CreateStaffDialog({ canAssignOwner }: { canAssignOwner: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState("STAFF");
  const router = useRouter();
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    createStaff,
    undefined,
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Created.");
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
          <Plus className="h-4 w-4" /> Add staff
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New staff account</DialogTitle>
            <DialogDescription>
              Create login credentials for a team member.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="role" value={role} />

          <div className="space-y-2">
            <Label htmlFor="staff-name">Name</Label>
            <Input id="staff-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input id="staff-email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-password">Temporary password</Label>
            <Input
              id="staff-password"
              name="password"
              type="text"
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canAssignOwner ? (
                  <SelectItem value="OWNER">
                    Owner (full access incl. finances)
                  </SelectItem>
                ) : null}
                <SelectItem value="ADMIN">
                  Admin (manage members &amp; packages)
                </SelectItem>
                <SelectItem value="STAFF">Staff (day-to-day)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <CreateSubmit />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
