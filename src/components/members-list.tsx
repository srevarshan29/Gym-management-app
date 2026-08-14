"use client";

import * as React from "react";
import { LockedLink } from "@/components/navigation/locked-link";
import { Search } from "lucide-react";
import type { MemberGender } from "@prisma/client";

import { MemberAvatar } from "@/components/member-avatar";
import { PendingDuesBadge, StatusBadge } from "@/components/status-badge";
import { PtBadge } from "@/components/pt-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SubscriptionStatus } from "@/lib/subscription";
import { formatCurrency, formatDate, phoneDigits } from "@/lib/utils";

export type MembersListItem = {
  id: string;
  memberNumber: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  packageName: string | null;
  addedByName: string | null;
  status: SubscriptionStatus;
  isPt: boolean;
  pendingAmount: number;
  endDate: string | null;
};

type MembersListProps = {
  members: MembersListItem[];
};

function formatMemberNumberDisplay(memberNumber: number): string {
  return String(memberNumber).padStart(4, "0");
}

function matchesMemberNumber(memberNumber: number, query: string): boolean {
  let q = query.trim().toLowerCase();
  if (q.startsWith("#")) q = q.slice(1).trim();
  if (!q) return false;

  const padded = formatMemberNumberDisplay(memberNumber);
  const raw = String(memberNumber);

  if (padded.includes(q) || raw.includes(q)) return true;

  const qDigits = phoneDigits(q);
  if (qDigits.length > 0 && padded.includes(qDigits)) return true;

  return false;
}

function matchesSearch(member: MembersListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (member.name.toLowerCase().includes(q)) return true;

  if (matchesMemberNumber(member.memberNumber, query)) return true;

  const phone = member.phone.trim();
  if (phone.toLowerCase().includes(q)) return true;

  const qDigits = phoneDigits(query);
  if (qDigits.length > 0 && phoneDigits(phone).includes(qDigits)) return true;

  return false;
}

export function MembersList({ members }: MembersListProps) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(
    () => members.filter((member) => matchesSearch(member, query)),
    [members, query],
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or member #…"
          className="pl-9"
          aria-label="Search members"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No members yet. Click &quot;Add member&quot; to get started.
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No members match your search.
            </p>
          ) : (
            <>
              <ul className="divide-y md:hidden">
                {filtered.map((m) => (
                  <li key={m.id}>
                    <LockedLink
                      href={`/members/${m.id}`}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <MemberAvatar
                        name={m.name}
                        photoUrl={m.photoUrl}
                        gender={m.gender}
                        seed={m.id}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{m.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              #{String(m.memberNumber).padStart(4, "0")} · {m.phone}
                            </p>
                          </div>
                          {m.pendingAmount > 0 ? (
                            <span className="shrink-0 font-mono text-xs font-medium">
                              {formatCurrency(m.pendingAmount)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {m.packageName ?? "No package"}
                          {m.endDate
                            ? ` · ${formatDate(new Date(m.endDate))}`
                            : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={m.status} />
                          {m.isPt ? <PtBadge /> : null}
                          {m.pendingAmount > 0 ? <PendingDuesBadge /> : null}
                        </div>
                      </div>
                    </LockedLink>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
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
                {filtered.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer">
                    <TableCell className="px-3 py-3">
                      <LockedLink
                        href={`/members/${m.id}`}
                        className="block font-mono text-muted-foreground"
                      >
                        #{String(m.memberNumber).padStart(4, "0")}
                      </LockedLink>
                    </TableCell>
                    <TableCell className="min-w-[140px] max-w-[200px] px-3 py-3">
                      <LockedLink
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
                      </LockedLink>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-3 tabular-nums">
                      <LockedLink href={`/members/${m.id}`} className="block font-mono">
                        {m.phone}
                      </LockedLink>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <LockedLink href={`/members/${m.id}`} className="block">
                        {m.packageName ?? (
                          <span className="text-muted-foreground">No package</span>
                        )}
                      </LockedLink>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <LockedLink
                        href={`/members/${m.id}`}
                        className="block text-muted-foreground"
                      >
                        {m.addedByName ?? "—"}
                      </LockedLink>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <LockedLink href={`/members/${m.id}`} className="block">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={m.status} />
                          {m.isPt ? <PtBadge /> : null}
                          {m.pendingAmount > 0 ? <PendingDuesBadge /> : null}
                        </div>
                      </LockedLink>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <LockedLink href={`/members/${m.id}`} className="block font-mono">
                        {m.pendingAmount > 0 ? (
                          formatCurrency(m.pendingAmount)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </LockedLink>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <LockedLink href={`/members/${m.id}`} className="block font-mono">
                        {m.endDate ? (
                          formatDate(new Date(m.endDate))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </LockedLink>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
