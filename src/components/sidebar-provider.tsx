"use client";

import * as React from "react";

const STORAGE_KEY = "gymdesk-sidebar-collapsed";

type SidebarContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {
      // Ignore localStorage errors (private browsing, etc.)
    }
    setHydrated(true);
  }, []);

  const closeMobile = React.useCallback(() => setMobileOpen(false), []);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onViewportChange = () => {
      if (mq.matches) closeMobile();
    };
    onViewportChange();
    mq.addEventListener("change", onViewportChange);
    return () => mq.removeEventListener("change", onViewportChange);
  }, [closeMobile]);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, []);

  const openMobile = React.useCallback(() => setMobileOpen(true), []);
  const toggleMobile = React.useCallback(
    () => setMobileOpen((open) => !open),
    [],
  );

  const value = React.useMemo(
    () => ({
      collapsed: hydrated ? collapsed : false,
      toggleCollapsed,
      mobileOpen,
      openMobile,
      closeMobile,
      toggleMobile,
    }),
    [
      collapsed,
      hydrated,
      toggleCollapsed,
      mobileOpen,
      openMobile,
      closeMobile,
      toggleMobile,
    ],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
