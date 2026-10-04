import { formatMemberNumber } from "@/lib/receipt-display";
import type { AttendanceListItem } from "@/lib/attendance/types";
import { formatDateTime } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AttendanceTodayTableProps = {
  rows: AttendanceListItem[];
};

export function AttendanceTodayTable({ rows }: AttendanceTodayTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No check-ins yet today. Enter a member number to mark attendance.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member #</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead>Method</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{formatMemberNumber(row.memberNumber)}</TableCell>
            <TableCell>{row.memberName}</TableCell>
            <TableCell>{formatDateTime(row.checkedInAt)}</TableCell>
            <TableCell className="capitalize">{row.method}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AttendanceHistoryList({ rows }: { rows: AttendanceListItem[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No attendance records yet.</p>
    );
  }

  return (
    <ul className="divide-y rounded-md border text-sm">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
        >
          <span>{formatDateTime(row.checkedInAt)}</span>
          <span className="capitalize text-muted-foreground">{row.method}</span>
        </li>
      ))}
    </ul>
  );
}
