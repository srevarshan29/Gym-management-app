"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { LockedLink } from "@/components/navigation/locked-link";
import { useSharedNavigationLock } from "@/components/navigation/navigation-lock-provider";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TOOLS = [
  {
    href: "/member/tools/bmi",
    title: "BMI Calculator",
    description: "Body mass index from height and weight.",
  },
  {
    href: "/member/tools/protein",
    title: "Protein Calculator",
    description: "Daily protein range for your weight.",
  },
  {
    href: "/member/tools/calorie",
    title: "Calorie Calculator",
    description: "Daily calorie target for your goal.",
  },
] as const;

function ToolsTabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const { navigate, isLocked } = useSharedNavigationLock();

  return (
    <Link
      href={href}
      onClick={(e) => navigate(href, e)}
      aria-disabled={isLocked}
      className={cn(
        "shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function ToolsSubNav({ activeHref }: { activeHref?: string }) {
  const { isLocked } = useSharedNavigationLock();

  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-border pb-px",
        isLocked && "pointer-events-none",
      )}
      aria-busy={isLocked}
    >
      <ToolsTabLink href="/member/tools" active={activeHref === "/member/tools"}>
        All tools
      </ToolsTabLink>
      {TOOLS.map((tool) => (
        <ToolsTabLink
          key={tool.href}
          href={tool.href}
          active={activeHref === tool.href}
        >
          {tool.title.replace(" Calculator", "")}
        </ToolsTabLink>
      ))}
    </nav>
  );
}

export function ToolsIndexList() {
  return (
    <div className="space-y-3">
      {TOOLS.map((tool) => (
        <LockedLink key={tool.href} href={tool.href} className="block">
          <Card className="rounded-2xl border-0 bg-card/90 shadow-soft ring-1 ring-border/70 transition-colors hover:ring-primary/30">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{tool.title}</p>
                <p className="text-sm text-muted-foreground">
                  {tool.description}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </LockedLink>
      ))}
    </div>
  );
}
