"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useActionLock } from "@/hooks/use-action-lock";

import { deleteEmployee } from "@/app/actions/employees";
import type { EmployeeInput } from "@/components/employee-dialog";
import { EmployeeDialog } from "@/components/employee-dialog";
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
import { formatCurrency, formatDate } from "@/lib/utils";

type EmployeesListProps = {
  employees: EmployeeInput[];
};

function matchesSearch(employee: EmployeeInput, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return employee.name.toLowerCase().includes(q);
}

function DeleteEmployeeButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = React.useState(false);
  const { run, isPending } = useActionLock();
  const router = useRouter();

  function onDelete() {
    run(async () => {
      const result = await deleteEmployee(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Employee removed.");
      setOpen(false);
      router.refresh();
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
          <DialogTitle>Remove employee</DialogTitle>
          <DialogDescription>
            Remove {name} from the employee roster? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onDelete} disabled={isPending}>
            {isPending ? "Removing..." : "Remove employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EmployeesList({ employees }: EmployeesListProps) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => employees.filter((employee) => matchesSearch(employee, query)),
    [employees, query],
  );

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="pl-9"
          aria-label="Search employees"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No employees yet. Click &quot;Add employee&quot; to create your first
              HR record.
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No employees match your search.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Joining date</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((employee) => (
                  <TableRow key={employee.id} className="hover-lift-row">
                    <TableCell className="min-w-[120px] max-w-[180px] px-3 py-3">
                      <p className="truncate font-medium">{employee.name}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-3 font-mono tabular-nums">
                      {employee.phone}
                    </TableCell>
                    <TableCell className="px-3 py-3">{employee.position}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-3 font-mono">
                      {formatDate(employee.joiningDate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-3 font-mono">
                      {employee.salary != null ? (
                        formatCurrency(employee.salary)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <EmployeeDialog
                          employee={employee}
                          trigger={
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          }
                        />
                        <DeleteEmployeeButton
                          id={employee.id}
                          name={employee.name}
                        />
                      </div>
                    </TableCell>
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
