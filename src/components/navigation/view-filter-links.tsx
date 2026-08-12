"use client";

import Link from "next/link";

import { useSharedNavigationLock } from "@/components/navigation/navigation-lock-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewFilterItem<T extends string> = {
  value: T;
  label: string;
  href: string;
};

export function ViewFilterLinks<T extends string>({
  view,
  items,
}: {
  view: T;
  items: ViewFilterItem<T>[];
}) {
  const { navigate, isLocked } = useSharedNavigationLock();

  return (
    <div
      className={cn("flex flex-wrap gap-2", isLocked && "pointer-events-none")}
      aria-busy={isLocked}
    >
      {items.map((item) => (
        <Button
          key={item.value}
          asChild
          size="sm"
          variant={view === item.value ? "default" : "outline"}
        >
          <Link
            href={item.href}
            onClick={(e) => navigate(item.href, e)}
            aria-disabled={isLocked}
          >
            {item.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
