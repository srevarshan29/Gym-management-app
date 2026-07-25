"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DashboardStatSparkline } from "@/components/dashboard-stat-sparkline";
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
  {
    accent: string;
    icon: string;
    hover: string;
    sparkline: string;
    footerLink: string;
  }
> = {
  green: {
    accent: "from-emerald-500/20 to-transparent",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    hover: "hover:shadow-glow-lift hover:ring-primary/35",
    sparkline: "hsl(142 71% 45%)",
    footerLink: "text-primary",
  },
  blue: {
    accent: "from-sky-500/20 to-transparent",
    icon: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    hover: "hover:shadow-glow-lift hover:ring-primary/35",
    sparkline: "hsl(199 89% 48%)",
    footerLink: "text-primary",
  },
  orange: {
    accent: "from-[hsl(var(--status-expiring)/0.25)] to-transparent",
    icon: "bg-[hsl(var(--status-expiring)/0.15)] text-[hsl(var(--status-expiring))]",
    hover:
      "hover:shadow-[0_0_0_1px_hsl(var(--status-expiring)/0.5),0_0_16px_-2px_hsl(var(--status-expiring)/0.45)] hover:ring-[hsl(var(--status-expiring)/0.4)]",
    sparkline: "hsl(var(--status-expiring))",
    footerLink: "text-[hsl(var(--status-expiring))]",
  },
  red: {
    accent: "from-[hsl(var(--status-expired)/0.25)] to-transparent",
    icon: "bg-[hsl(var(--status-expired)/0.15)] text-[hsl(var(--status-expired))]",
    hover:
      "hover:shadow-[0_0_0_1px_hsl(var(--status-expired)/0.5),0_0_16px_-2px_hsl(var(--status-expired)/0.45)] hover:ring-[hsl(var(--status-expired)/0.4)]",
    sparkline: "hsl(var(--status-expired))",
    footerLink: "text-[hsl(var(--status-expired))]",
  },
  primary: {
    accent: "from-primary/25 to-transparent",
    icon: "bg-primary/15 text-primary",
    hover: "hover:shadow-glow-lift hover:ring-primary/35",
    sparkline: "hsl(var(--primary))",
    footerLink: "text-primary",
  },
  amber: {
    accent: "from-amber-500/20 to-transparent",
    icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    hover: "hover:shadow-glow-lift hover:ring-primary/35",
    sparkline: "hsl(38 92% 50%)",
    footerLink: "text-primary",
  },
};

export function DashboardStatCard({
  title,
  value,
  hint,
  icon,
  href,
  tone,
  sparkline,
  footerLabel,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  href: string;
  tone: DashboardStatTone;
  sparkline: number[];
  footerLabel?: string;
}) {
  const styles = TONE_CLASSES[tone];

  return (
    <Link href={href} className="group block cursor-pointer">
      <Card
        className={cn(
          "relative overflow-hidden rounded-2xl border-0 bg-card/90 shadow-soft backdrop-blur-sm",
          "ring-1 ring-border/70 transition-[transform,box-shadow,ring-color] duration-150 ease-out",
          "hover:-translate-y-0.5",
          styles.hover,
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b opacity-80",
            styles.accent,
          )}
          aria-hidden
        />
        <CardContent className="relative space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
                styles.icon,
              )}
            >
              {icon}
            </div>
            <DashboardStatSparkline data={sparkline} color={styles.sparkline} />
          </div>

          <div className="min-w-0 space-y-1">
            <p className="text-sm leading-none text-muted-foreground">{title}</p>
            <p className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {hint ? (
              <p className="truncate text-xs text-muted-foreground">{hint}</p>
            ) : null}
          </div>

          {footerLabel ? (
            <p
              className={cn(
                "flex items-center gap-1 text-xs font-medium transition-colors",
                styles.footerLink,
              )}
            >
              {footerLabel}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
