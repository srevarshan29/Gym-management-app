import Link from "next/link";
import { ChevronRight } from "lucide-react";

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

export function ToolsSubNav({ activeHref }: { activeHref?: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
      <Link
        href="/member/tools"
        className={cn(
          "shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
          activeHref === "/member/tools"
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        All tools
      </Link>
      {TOOLS.map((tool) => (
        <Link
          key={tool.href}
          href={tool.href}
          className={cn(
            "shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
            activeHref === tool.href
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          {tool.title.replace(" Calculator", "")}
        </Link>
      ))}
    </nav>
  );
}

export function ToolsIndexList() {
  return (
    <div className="space-y-3">
      {TOOLS.map((tool) => (
        <Link key={tool.href} href={tool.href} className="block">
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
        </Link>
      ))}
    </div>
  );
}
