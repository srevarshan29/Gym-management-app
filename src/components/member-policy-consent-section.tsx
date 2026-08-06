import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatDateTime } from "@/lib/utils";

type Props = {
  agreedText: string | null;
  agreedAt: Date | null;
};

export function MemberPolicyConsentSection({ agreedText, agreedAt }: Props) {
  const agreed =
    agreedText != null &&
    agreedText.trim().length > 0 &&
    agreedAt != null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Membership policy</CardTitle>
        <CardDescription>
          Record of policy acceptance at registration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Agreed to policy
            </p>
            <p
              className={cn(
                "mt-1 text-sm font-medium",
                agreed ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {agreed ? "Yes" : "No"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Agreed on
            </p>
            <p className="mt-1 font-mono text-sm font-medium">
              {agreed && agreedAt ? formatDateTime(agreedAt) : "—"}
            </p>
          </div>
        </div>

        {agreed && agreedText ? (
          <details className="rounded-lg border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              View policy text accepted at registration
            </summary>
            <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-sm text-muted-foreground">
              {agreedText}
            </pre>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
