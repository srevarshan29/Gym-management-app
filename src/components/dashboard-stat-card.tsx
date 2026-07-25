import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DashboardStatTone =
  | "green"
  | "blue"
  | "orange"
  | "red"
  | "primary"
  | "amber";

const TONE_CLASSES: Record<
  DashboardStatTone,
  { border: string; icon: string }
> = {
  green: {
    border: "border-l-emerald-500",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  blue: {
    border: "border-l-sky-500",
    icon: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  orange: {
    border: "border-l-[hsl(var(--status-expiring))]",
    icon: "bg-[hsl(var(--status-expiring)/0.15)] text-[hsl(var(--status-expiring))]",
  },
  red: {
    border: "border-l-[hsl(var(--status-expired))]",
    icon: "bg-[hsl(var(--status-expired)/0.15)] text-[hsl(var(--status-expired))]",
  },
  primary: {
    border: "border-l-primary",
    icon: "bg-primary/15 text-primary",
  },
  amber: {
    border: "border-l-amber-500",
    icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
};

export function DashboardStatCard({
  title,
  value,
  hint,
  icon,
  href,
  tone,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  href: string;
  tone: DashboardStatTone;
}) {
  const styles = TONE_CLASSES[tone];

  return (
    <Link href={href} className="block cursor-pointer">
      <Card
        className={cn(
          "hover-lift border-l-4 transition-[transform,box-shadow]",
          styles.border,
        )}
      >
        <CardContent className="flex items-center gap-4 p-6">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              styles.icon,
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {hint ? (
              <p className="truncate text-xs text-muted-foreground">{hint}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
