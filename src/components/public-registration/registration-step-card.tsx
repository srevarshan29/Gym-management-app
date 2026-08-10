import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type RegistrationStepCardProps = {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function RegistrationStepCard({
  icon: Icon,
  title,
  children,
  className,
}: RegistrationStepCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/90 p-5 shadow-soft",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="font-display text-base font-semibold text-foreground">
          {title}
        </h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
