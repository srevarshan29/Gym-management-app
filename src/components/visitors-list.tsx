"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { deleteVisitor } from "@/app/actions/visitors";
import type { VisitorInput } from "@/components/visitor-dialog";
import { VisitorDialog } from "@/components/visitor-dialog";
import { LockedLink } from "@/components/navigation/locked-link";
import { ViewFilterLinks } from "@/components/navigation/view-filter-links";
import { useActionLock } from "@/hooks/use-action-lock";
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
import type { VisitorStatusFilter } from "@/lib/visitors";
import { formatDate } from "@/lib/utils";

type VisitorsListProps = {
  visitors: VisitorInput[];
  canManage: boolean;
  view: VisitorStatusFilter;
};

function matchesSearch(visitor: VisitorInput, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    visitor.name.toLowerCase().includes(q) ||
    visitor.phone.toLowerCase().includes(q)
  );
}

function emptyMessage(view: VisitorStatusFilter): string {
  switch (view) {
    case "converted":
      return "No converted visitors yet.";
    case "all":
      return "No visitors logged yet. Click \"Log visitor\" to record a walk-in or trial visit.";
    default:
      return "No pending visitors. Click \"Log visitor\" to record a walk-in or trial visit.";
  }
}

function DeleteVisitorButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { run, isPending } = useActionLock();
  const router = useRouter();

  function onDelete() {
    run(async () => {
      const result = await deleteVisitor(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Visitor deleted.");
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
          <DialogTitle>Delete visitor</DialogTitle>
          <DialogDescription>
            Remove {name} from the visitor log? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete visitor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewFilter({ view }: { view: VisitorStatusFilter }) {
  const items: { value: VisitorStatusFilter; label: string; href: string }[] = [
    { value: "pending", label: "Pending", href: "/members/visitors" },
    {
      value: "converted",
      label: "Converted",
      href: "/members/visitors?view=converted",
    },
    { value: "all", label: "All", href: "/members/visitors?view=all" },
  ];

  return <ViewFilterLinks view={view} items={items} />;
}

export function VisitorsList({ visitors, canManage, view }: VisitorsListProps) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => visitors.filter((visitor) => matchesSearch(visitor, query)),
    [visitors, query],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ViewFilter view={view} />
        <div className="relative w-full max-w-md sm:w-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or phone…"
            className="pl-9"
            aria-label="Search visitors"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {visitors.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {emptyMessage(view)}
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No visitors match your search.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Visit date</TableHead>
                  <TableHead>Notes</TableHead>
                  {view !== "pending" ? <TableHead>Status</TableHead> : null}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((visitor) => {
                  const convertHref =
                    `/members/new?name=${encodeURIComponent(visitor.name)}` +
                    `&phone=${encodeURIComponent(visitor.phone)}` +
                    `&visitorId=${encodeURIComponent(visitor.id)}`;
                  const isPending = visitor.status === "pending";

                  return (
                    <TableRow key={visitor.id} className="hover-lift-row">
                      <TableCell className="min-w-[120px] max-w-[180px] px-3 py-3">
                        <p className="truncate font-medium">{visitor.name}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-3 font-mono tabular-nums">
                        {visitor.phone}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-3 font-mono">
                        {formatDate(visitor.visitDate)}
                      </TableCell>
                      <TableCell className="max-w-[220px] px-3 py-3">
                        {visitor.notes ? (
                          <p className="truncate text-sm text-muted-foreground">
                            {visitor.notes}
                          </p>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {view !== "pending" ? (
                        <TableCell className="whitespace-nowrap px-3 py-3">
                          <span
                            className={
                              isPending
                                ? "text-muted-foreground"
                                : "text-primary"
                            }
                          >
                            {isPending ? "Pending" : "Converted"}
                          </span>
                        </TableCell>
                      ) : null}
                      <TableCell className="px-3 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {canManage && isPending ? (
                            <VisitorDialog
                              visitor={visitor}
                              trigger={
                                <Button variant="outline" size="sm">
                                  Edit
                                </Button>
                              }
                            />
                          ) : null}
                          {isPending ? (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="gap-1 hover-lift"
                            >
                              <LockedLink href={convertHref}>
                                <UserPlus className="h-3.5 w-3.5" />
                                Convert
                              </LockedLink>
                            </Button>
                          ) : null}
                          {canManage ? (
                            <DeleteVisitorButton
                              id={visitor.id}
                              name={visitor.name}
                            />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
