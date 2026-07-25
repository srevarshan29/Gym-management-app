import Link from "next/link";
import { Plus } from "lucide-react";

import { requireGym } from "@/lib/session";
import { getMembersWithStatus } from "@/lib/queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { MemberAvatar } from "@/components/member-avatar";
import { PendingDuesBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MembersPage() {
  const user = await requireGym();
  const members = await getMembersWithStatus(user.gymId);

  return (
    <div>
      <PageHeader
        title="Members"
        description={`${members.length} member${members.length === 1 ? "" : "s"} total.`}
      >
        <Button asChild className="gap-1">
          <Link href="/members/new">
            <Plus className="h-4 w-4" /> Add member
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No members yet. Click &quot;Add member&quot; to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Added by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer">
                    <TableCell className="px-3 py-3">
                      <Link href={`/members/${m.id}`} className="block font-mono text-muted-foreground">
                        #{String(m.memberNumber).padStart(4, "0")}
                      </Link>
                    </TableCell>
                    <TableCell className="min-w-[140px] max-w-[200px] px-3 py-3">
                      <Link
                        href={`/members/${m.id}`}
                        className="flex min-w-0 items-center gap-2"
                      >
                        <MemberAvatar
                          name={m.name}
                          photoUrl={m.photoUrl}
                          gender={m.gender}
                          seed={m.id}
                          size="sm"
                        />
                        <span className="truncate font-medium">{m.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-3 tabular-nums">
                      <Link href={`/members/${m.id}`} className="block font-mono">
                        {m.phone}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Link href={`/members/${m.id}`} className="block">
                        {m.packageName ?? (
                          <span className="text-muted-foreground">
                            No package
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Link href={`/members/${m.id}`} className="block text-muted-foreground">
                        {m.addedByName ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Link href={`/members/${m.id}`} className="block">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={m.status} />
                          {m.pendingAmount > 0 ? <PendingDuesBadge /> : null}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Link href={`/members/${m.id}`} className="block font-mono">
                        {m.pendingAmount > 0 ? (
                          formatCurrency(m.pendingAmount)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <Link href={`/members/${m.id}`} className="block font-mono">
                        {m.endDate ? (
                          formatDate(m.endDate)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </Link>
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
