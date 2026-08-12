"use client";

import { NavigationLockProvider } from "@/components/navigation/navigation-lock-provider";

export function RegisterShell({ children }: { children: React.ReactNode }) {
  return (
    <NavigationLockProvider>
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    </NavigationLockProvider>
  );
}
