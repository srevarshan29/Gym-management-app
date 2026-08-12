"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { updatePtTrainer } from "@/app/actions/pt-members";
import type { PtTrainerGroup } from "@/lib/pt-members";
import { MemberAvatar } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type PtMembersPanelProps = {
  groups: PtTrainerGroup[];
  staffOptions: { id: string; name: string }[];
  canManage: boolean;
};

const UNASSIGNED_VALUE = "__none__";

function TrainerSelect({
  memberId,
  trainerId,
  staffOptions,
  disabled,
}: {
  memberId: string;
  trainerId: string | null;
  staffOptions: { id: string; name: string }[];
  disabled: boolean;
}) {
  const [value, setValue] = React.useState(trainerId ?? UNASSIGNED_VALUE);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setValue(trainerId ?? UNASSIGNED_VALUE);
  }, [trainerId]);

  async function onChange(next: string) {
    setValue(next);
    setPending(true);
    try {
      const result = await updatePtTrainer(
        memberId,
        next === UNASSIGNED_VALUE ? null : next,
      );
      if (!result.ok) {
        toast.error(result.error);
        setValue(trainerId ?? UNASSIGNED_VALUE);
        return;
      }
      toast.success(result.message ?? "Trainer updated.");
    } catch (error) {
      console.error("[pt-members] updatePtTrainer failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update trainer. Please try again.",
      );
      setValue(trainerId ?? UNASSIGNED_VALUE);
    } finally {
      setPending(false);
    }
  }

  if (disabled) {
    return (
      <span className="text-sm text-muted-foreground">
        {trainerId
          ? staffOptions.find((s) => s.id === trainerId)?.name ?? "Assigned"
          : "Unassigned"}
      </span>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className="h-9 w-[180px]">
        <SelectValue placeholder="Assign trainer" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED_VALUE}>No trainer</SelectItem>
        {staffOptions.map((staff) => (
          <SelectItem key={staff.id} value={staff.id}>
            {staff.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PtMembersPanel({
  groups,
  staffOptions,
  canManage,
}: PtMembersPanelProps) {
  if (groups.length === 0) {
    return (
      <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No PT members yet. Mark a member as PT when adding or editing them.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card
          key={group.trainerId ?? "unassigned"}
          className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group.trainerName}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.members.map((member) => (
                  <TableRow key={member.id} className="hover-lift-row">
                    <TableCell className="min-w-[140px] max-w-[200px] px-3 py-3">
                      <Link
                        href={`/members/${member.id}`}
                        className="flex min-w-0 items-center gap-2"
                      >
                        <MemberAvatar
                          name={member.name}
                          photoUrl={member.photoUrl}
                          gender={member.gender}
                          seed={member.id}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{member.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            #{String(member.memberNumber).padStart(4, "0")}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-3 font-mono tabular-nums">
                      {member.phone}
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      {member.packageName ?? (
                        <span className="text-muted-foreground">No package</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <TrainerSelect
                        memberId={member.id}
                        trainerId={member.trainerId}
                        staffOptions={staffOptions}
                        disabled={!canManage}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-1 hover-lift"
                      >
                        <Link href={`/members/${member.id}`}>
                          View profile
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
