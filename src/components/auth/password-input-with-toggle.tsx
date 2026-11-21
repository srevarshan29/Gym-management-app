"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";

type PasswordInputWithToggleProps = React.ComponentProps<typeof Input>;

export function PasswordInputWithToggle({
  className,
  ...props
}: PasswordInputWithToggleProps) {
  const [showPassword, setShowPassword] = useState(false);
  const mergedClassName = ["pr-10", className].filter(Boolean).join(" ");

  return (
    <div className="relative">
      <Input
        {...props}
        type={showPassword ? "text" : "password"}
        className={mergedClassName}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={showPassword ? "Hide password" : "Show password"}
        aria-pressed={showPassword}
        onClick={() => setShowPassword((current) => !current)}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}