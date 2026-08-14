"use client";

import * as React from "react";
import { LockedLink } from "@/components/navigation/locked-link";
import { useSharedNavigationLock } from "@/components/navigation/navigation-lock-provider";
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
import { useMediaQuery } from "@/hooks/use-media-query";
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

function MemberBadges({ member }: { member: MembersListItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusBadge status={member.status} />
      {member.isPt ? <PtBadge /> : null}
      {member.pendingAmount > 0 ? <PendingDuesBadge /> : null}
    </div>
  );
}

function MemberCard({ member }: { member: MembersListItem }) {
  return (
    <li>
      <LockedLink
        href={`/members/${member.id}`}
        className="flex items-start gap-3 px-4 py-3 active:bg-muted/60"
      >
        <MemberAvatar
          name={member.name}
          photoUrl={member.photoUrl}
          gender={member.gender}
          seed={member.id}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{member.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                #{formatMemberNumberDisplay(member.memberNumber)} · {member.phone}
              </p>
            </div>
            {member.pendingAmount > 0 ? (
              <span className="shrink-0 font-mono text-xs font-medium">
                {formatCurrency(member.pendingAmount)}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {member.packageName ?? "No package"}
            {member.endDate ? ` · ${formatDate(new Date(member.endDate))}` : ""}
          </p>
          <div className="mt-2">
            <MemberBadges member={member} />
          </div>
        </div>
      </LockedLink>
    </li>
  );
}

function MembersTable({ members }: { members: MembersListItem[] }) {
  const { navigate } = useSharedNavigationLock();

  return (
    <Table className="min-w-[36rem]">
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Member</TableHead>
          <TableHead className="hidden lg:table-cell">Phone</TableHead>
          <TableHead>Package</TableHead>
          <TableHead className="hidden xl:table-cell">Added by</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden lg:table-cell">Pending</TableHead>
          <TableHead>Expires</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => (
          <TableRow
            key={m.id}
            className="cursor-pointer"
            onClick={() => {
              navigate(`/members/${m.id}`);
            }}
          >
            <TableCell className="whitespace-nowrap px-3 py-3 font-mono text-muted-foreground">
              #{formatMemberNumberDisplay(m.memberNumber)}
            </TableCell>
            <TableCell className="min-w-0 max-w-[220px] px-3 py-3">
              <LockedLink
                href={`/members/${m.id}`}
                className="flex min-w-0 items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <MemberAvatar
                  name={m.name}
                  photoUrl={m.photoUrl}
                  gender={m.gender}
                  seed={m.id}
                  size="sm"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block truncate font-mono text-xs text-muted-foreground lg:hidden">
                    {m.phone}
                  </span>
                </span>
              </LockedLink>
            </TableCell>
            <TableCell className="hidden whitespace-nowrap px-3 py-3 font-mono tabular-nums lg:table-cell">
              {m.phone}
            </TableCell>
            <TableCell className="max-w-[160px] truncate px-3 py-3">
              {m.packageName ?? (
                <span className="text-muted-foreground">No package</span>
              )}
            </TableCell>
            <TableCell className="hidden max-w-[140px] truncate px-3 py-3 text-muted-foreground xl:table-cell">
              {m.addedByName ?? "—"}
            </TableCell>
            <TableCell className="px-3 py-3">
              <MemberBadges member={m} />
            </TableCell>
            <TableCell className="hidden whitespace-nowrap px-3 py-3 font-mono lg:table-cell">
              {m.pendingAmount > 0 ? (
                formatCurrency(m.pendingAmount)
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap px-3 py-3 font-mono">
              {m.endDate ? (
                formatDate(new Date(m.endDate))
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function MembersList({ members }: MembersListProps) {
  const [query, setQuery] = React.useState("");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const filtered = React.useMemo(
    () => members.filter((member) => matchesSearch(member, query)),
    [members, query],
  );

  return (
    <div className="min-w-0 space-y-4">
      <div className="relative w-full max-w-md">
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

      <Card className="min-w-0 overflow-hidden">
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              No members yet. Click &quot;Add member&quot; to get started.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              No members match your search.
            </p>
          ) : isDesktop ? (
            <MembersTable members={filtered} />
          ) : (
            <ul className="divide-y">
              {filtered.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
