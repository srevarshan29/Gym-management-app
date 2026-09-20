"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useSidebar } from "@/components/sidebar-provider";
import { Button } from "@/components/ui/button";

export function SidebarToggle() {
  const { collapsed, toggleCollapsed, toggleMobile, mobileOpen } = useSidebar();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="inline-flex h-11 w-11 shrink-0 md:h-9 md:w-9"
        onClick={toggleMobile}
        aria-expanded={mobileOpen}
        aria-controls="mobile-sidebar"
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="hidden shrink-0 md:inline-flex"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <PanelLeftClose className="h-5 w-5" />
        )}
      </Button>
    </>
  );
}
