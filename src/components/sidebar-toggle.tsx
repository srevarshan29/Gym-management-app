"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useSidebar } from "@/components/sidebar-provider";
import { Button } from "@/components/ui/button";

export function SidebarToggle() {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
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
  );
}
