"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { deleteVisitor } from "@/app/actions/visitors";
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
import { memberGenderLabel } from "@/lib/member-gender";
import type { QrRegistrationRow } from "@/lib/registration";
import { formatDate } from "@/lib/utils";

type QrRegistrationsListProps = {
  registrations: QrRegistrationRow[];
  canManage: boolean;
  view: "pending" | "converted" | "all";
};

function matchesSearch(item: QrRegistrationRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.name.toLowerCase().includes(q) ||
    item.phone.toLowerCase().includes(q) ||
    (item.email?.toLowerCase().includes(q) ?? false)
  );
}

function DeleteRegistrationButton({
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
      toast.success(result.message ?? "Registration removed.");
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
          <DialogTitle>Delete registration</DialogTitle>
          <DialogDescription>
            Remove {name}&apos;s self-registration? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewFilter({ view }: { view: "pending" | "converted" | "all" }) {
  const items = [
    { value: "pending" as const, label: "Pending", href: "/members/register-qr" },
    {
      value: "converted" as const,
      label: "Converted",
      href: "/members/register-qr?view=converted",
    },
    {
      value: "all" as const,
      label: "All",
      href: "/members/register-qr?view=all",
    },
  ];

  return <ViewFilterLinks view={view} items={items} />;
}

export function QrRegistrationsList({
  registrations,
  canManage,
  view,
}: QrRegistrationsListProps) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => registrations.filter((row) => matchesSearch(row, query)),
    [registrations, query],
  );

  const emptyMessage =
    view === "converted"
      ? "No converted QR registrations yet."
      : view === "all"
        ? "No QR self-registrations yet."
        : "No pending QR registrations. Share the QR code above to get started.";

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
            placeholder="Search by name, phone, or email…"
            className="pl-9"
            aria-label="Search QR registrations"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {registrations.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No registrations match your search.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Submitted</TableHead>
                  {view !== "pending" ? <TableHead>Status</TableHead> : null}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const isPending = row.status === "pending";
                  const params = new URLSearchParams({
                    name: row.name,
                    phone: row.phone,
                    visitorId: row.id,
                  });
                  if (row.email) params.set("email", row.email);
                  if (row.gender) params.set("gender", row.gender);
                  const convertHref = `/members/new?${params.toString()}`;

                  return (
                    <TableRow key={row.id} className="hover-lift-row">
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {row.phone}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {row.email ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.gender ? (
                          memberGenderLabel(row.gender)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono">
                        {formatDate(row.createdAt)}
                      </TableCell>
                      {view !== "pending" ? (
                        <TableCell>
                          {isPending ? "Pending" : "Converted"}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-2">
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
                            <DeleteRegistrationButton
                              id={row.id}
                              name={row.name}
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
