import type { LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RegistrationInputProps = React.ComponentProps<typeof Input> & {
  label: string;
  icon: LucideIcon;
};

export function RegistrationInput({
  label,
  icon: Icon,
  id,
  className,
  ...props
}: RegistrationInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          className={cn(
            "bg-muted/40 pl-10 focus-visible:ring-primary",
            className,
          )}
          {...props}
        />
      </div>
    </div>
  );
}

type RegistrationSelectWrapperProps = {
  id: string;
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
};

export function RegistrationSelectWrapper({
  id,
  label,
  icon: Icon,
  children,
}: RegistrationSelectWrapperProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
