import { requireMember } from "@/lib/member-session";
import { getMemberPortalPayments } from "@/lib/member-portal/queries";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

export default async function MemberPaymentsPage() {
  const session = await requireMember();
  const payments = await getMemberPortalPayments(
    session.gymId,
    session.memberId,
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-bold">Payments</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>For</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">
                      {formatDate(p.paidAt)}
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {formatCurrency(Number(p.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {METHOD_LABEL[p.method] ?? p.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.subscription?.package.name ?? "—"}
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
