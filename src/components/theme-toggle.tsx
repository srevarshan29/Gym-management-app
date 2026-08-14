"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid a hydration mismatch: the server can't know the persisted theme,
  // so render a stable placeholder until the client has mounted.
  React.useEffect(() => setMounted(true), []);

  function toggle() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle dark/light theme"
      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground sm:h-10 sm:w-10"
    >
      {mounted && resolvedTheme === "light" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
