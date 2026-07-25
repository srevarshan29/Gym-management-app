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
    ring: string;
    hover: string;
    sparkline: string;
    footerLink: string;
    trend: string;
  }
> = {
  green: {
    accent: "from-primary/20 to-transparent",
    icon: "bg-primary/15 text-primary",
    ring: "ring-border/70",
    hover: "hover:shadow-glow-lift hover:ring-primary/35",
    sparkline: "hsl(var(--primary))",
    footerLink: "text-primary",
    trend: "text-primary",
  },
  blue: {
    accent: "from-primary/20 to-transparent",
    icon: "bg-primary/15 text-primary",
    ring: "ring-border/70",
    hover: "hover:shadow-glow-lift hover:ring-primary/35",
    sparkline: "hsl(var(--primary))",
    footerLink: "text-primary",
    trend: "text-primary",
  },
  primary: {
    accent: "from-primary/25 to-transparent",
    icon: "bg-primary/15 text-primary",
    ring: "ring-border/70",
    hover: "hover:shadow-glow-lift hover:ring-primary/35",
    sparkline: "hsl(var(--primary))",
    footerLink: "text-primary",
    trend: "text-primary",
  },
  amber: {
    accent: "from-primary/15 to-transparent",
    icon: "bg-primary/15 text-primary",
    ring: "ring-primary/30",
    hover: "hover:shadow-glow-lift hover:ring-primary/35",
    sparkline: "hsl(var(--primary))",
    footerLink: "text-primary",
    trend: "text-primary",
  },
  orange: {
    accent: "from-[hsl(var(--status-expiring)/0.25)] to-transparent",
    icon: "bg-[hsl(var(--status-expiring)/0.15)] text-[hsl(var(--status-expiring))]",
    ring: "ring-[hsl(var(--status-expiring)/0.35)]",
    hover:
      "hover:shadow-[0_0_0_1px_hsl(var(--status-expiring)/0.5),0_0_16px_-2px_hsl(var(--status-expiring)/0.45)] hover:ring-[hsl(var(--status-expiring)/0.4)]",
    sparkline: "hsl(var(--status-expiring))",
    footerLink: "text-[hsl(var(--status-expiring))]",
    trend: "text-[hsl(var(--status-expiring))]",
  },
  red: {
    accent: "from-[hsl(var(--status-expired)/0.25)] to-transparent",
    icon: "bg-[hsl(var(--status-expired)/0.15)] text-[hsl(var(--status-expired))]",
    ring: "ring-[hsl(var(--status-expired)/0.35)]",
    hover:
      "hover:shadow-[0_0_0_1px_hsl(var(--status-expired)/0.5),0_0_16px_-2px_hsl(var(--status-expired)/0.45)] hover:ring-[hsl(var(--status-expired)/0.4)]",
    sparkline: "hsl(var(--status-expired))",
    footerLink: "text-[hsl(var(--status-expired))]",
    trend: "text-[hsl(var(--status-expired))]",
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
  trendLabel,
  footerLabel,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  href: string;
  tone: DashboardStatTone;
  sparkline: number[];
  trendLabel?: string;
  footerLabel?: string;
}) {
  const styles = TONE_CLASSES[tone];
  const showSparkline = !footerLabel;

  return (
    <Link href={href} className="group block cursor-pointer">
      <Card
        className={cn(
          "relative overflow-hidden rounded-2xl border-0 bg-card/90 shadow-soft backdrop-blur-sm",
          "ring-1 transition-[transform,box-shadow,ring-color] duration-150 ease-out",
          "hover:-translate-y-0.5",
          styles.ring,
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
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5",
                styles.icon,
              )}
            >
              {icon}
            </div>
            <p className="text-sm font-medium leading-tight text-muted-foreground">
              {title}
            </p>
          </div>

          <div className="min-w-0 space-y-1">
            <p className="font-mono text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {hint ? (
              <p className="truncate text-xs text-muted-foreground">{hint}</p>
            ) : null}
          </div>

          <div className="flex min-h-10 items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              {trendLabel ? (
                <p className={cn("text-xs font-medium", styles.trend)}>
                  {trendLabel}
                </p>
              ) : footerLabel ? (
                <p
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    styles.footerLink,
                  )}
                >
                  {footerLabel}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </p>
              ) : null}
            </div>
            {showSparkline ? (
              <DashboardStatSparkline data={sparkline} color={styles.sparkline} />
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
