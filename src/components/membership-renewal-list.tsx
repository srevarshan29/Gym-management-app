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
import { useMediaQuery } from "@/hooks/use-media-query";
import { expiredDaysAgoLabel } from "@/lib/subscription";
import { formatDate } from "@/lib/utils";

export type MembershipRenewalListItem = {
  id: string;
  memberNumber: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  packageName: string;
  endDate: string;
};

type MembershipRenewalListProps = {
  items: MembershipRenewalListItem[];
  variant: "expired" | "upcoming";
  emptyMessage: string;
  searchPlaceholder: string;
  query: string;
  page: number;
  pageSize: number;
  matchingCount: number;
  bucketCount: number;
  makeHref: (page: number, q: string) => string;
  searchAction: string;
};

export function MembershipRenewalList({
  items,
  variant,
  emptyMessage,
  searchPlaceholder,
  query,
  page,
  pageSize,
  matchingCount,
  bucketCount,
  makeHref,
  searchAction,
}: MembershipRenewalListProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className="space-y-4">
      <form action={searchAction} className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={searchPlaceholder}
          className="pl-9"
          aria-label="Search members"
        />
      </form>

      <Card>
        <CardContent className="p-0">
          {bucketCount === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : matchingCount === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No members match your search.
            </p>
          ) : isDesktop ? (
            <Table className="min-w-[40rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Expiry date</TableHead>
                  {variant === "expired" ? (
                    <TableHead>Expired</TableHead>
                  ) : null}
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const endDate = new Date(item.endDate);
                  return (
                    <TableRow key={item.id} className="hover-lift-row">
                      <TableCell className="min-w-[140px] max-w-[200px] px-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <MemberAvatar
                            name={item.name}
                            photoUrl={item.photoUrl}
                            gender={item.gender}
                            seed={item.id}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.name}</p>
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
                      <TableCell className="whitespace-nowrap px-3 py-3 font-mono">
                        {formatDate(endDate)}
                      </TableCell>
                      {variant === "expired" ? (
                        <TableCell className="whitespace-nowrap px-3 py-3 text-status-expired">
                          {expiredDaysAgoLabel(endDate)}
                        </TableCell>
                      ) : null}
                      <TableCell className="px-3 py-3 text-right">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="gap-1 hover-lift"
                        >
                          <LockedLink href={`/members/${item.id}`}>
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
          ) : (
            <ul className="divide-y">
              {items.map((item) => {
                const endDate = new Date(item.endDate);
                return (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <MemberAvatar
                        name={item.name}
                        photoUrl={item.photoUrl}
                        gender={item.gender}
                        seed={item.id}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.packageName} · {formatDate(endDate)}
                        </p>
                        {variant === "expired" ? (
                          <p className="mt-1 text-xs text-status-expired">
                            {expiredDaysAgoLabel(endDate)}
                          </p>
                        ) : null}
                      </div>
                      <Button asChild variant="outline" size="sm" className="shrink-0">
                        <LockedLink href={`/members/${item.id}`}>View</LockedLink>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
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
