import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MemberPortalStatCardProps = {
  label: string;
  value: string;
  valueClassName?: string;
};

export function MemberPortalStatCard({
  label,
  value,
  valueClassName,
}: MemberPortalStatCardProps) {
  return (
    <Card className="min-w-0 rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 backdrop-blur-sm">
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "truncate font-mono text-xl font-bold tabular-nums tracking-tight",
            valueClassName,
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
