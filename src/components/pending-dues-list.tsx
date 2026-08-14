"use client";

import { LockedLink } from "@/components/navigation/locked-link";
import { PaginationBar } from "@/components/pagination-bar";
import { ArrowRight, Search } from "lucide-react";
import type { MemberGender } from "@prisma/client";

import { MemberAvatar } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
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
import { formatCurrency, formatDate } from "@/lib/utils";

export type PendingDuesListItem = {
  memberId: string;
  memberNumber: number;
  memberName: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  packageName: string;
  amountDue: number;
  endDate: string;
  subscriptionId: string;
};

type PendingDuesListProps = {
  items: PendingDuesListItem[];
  emptyMessage: string;
  query: string;
  page: number;
  pageSize: number;
  matchingCount: number;
  makeHref: (page: number, q: string) => string;
  searchAction: string;
  extraSearchFields?: Record<string, string>;
};

export function PendingDuesList({
  items,
  emptyMessage,
  query,
  page,
  pageSize,
  matchingCount,
  makeHref,
  searchAction,
  extraSearchFields,
}: PendingDuesListProps) {
  return (
    <div className="space-y-4">
      <form action={searchAction} className="relative max-w-md">
        {extraSearchFields
          ? Object.entries(extraSearchFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))
          : null}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by member name…"
          className="pl-9"
          aria-label="Search members by name"
        />
      </form>

      <Card>
        <CardContent className="p-0">
          {matchingCount === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {query.trim() ? "No members match your search." : emptyMessage}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Expiry date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const endDate = new Date(item.endDate);
                  return (
                    <TableRow key={item.subscriptionId} className="hover-lift-row">
                      <TableCell className="min-w-[140px] max-w-[200px] px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <MemberAvatar
                            name={item.memberName}
                            photoUrl={item.photoUrl}
                            gender={item.gender}
                            seed={item.memberId}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.memberName}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              #{String(item.memberNumber).padStart(4, "0")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-3 font-mono tabular-nums">
                        {item.phone}
                      </TableCell>
                      <TableCell className="px-3 py-3">{item.packageName}</TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-3 font-mono font-medium text-status-expiring">
                        {formatCurrency(item.amountDue)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-3 font-mono">
                        {formatDate(endDate)}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-right">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="gap-1 hover-lift"
                        >
                          <LockedLink href={`/members/${item.memberId}`}>
                            View profile
                            <ArrowRight className="h-3.5 w-3.5" />
                          </LockedLink>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={matchingCount}
        makeHref={(nextPage) => makeHref(nextPage, query)}
      />
    </div>
  );
}
