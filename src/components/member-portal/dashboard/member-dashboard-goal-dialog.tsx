"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/components/member-portal/dashboard/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export const GOAL_EDITOR_MODAL_CLASS =
  "border border-white/10 bg-gradient-to-b from-[#1c2420] via-[#151a18] to-[#101412] shadow-[0_24px_80px_rgba(0,0,0,0.55)]";

export const GOAL_EDITOR_EYEBROW_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/75";

export const GOAL_EDITOR_SECONDARY_BUTTON_CLASS =
  "h-9 rounded-2xl border border-white/10 bg-[#262d2a] text-sm font-medium text-foreground shadow-none hover:bg-[#303833] sm:h-10";

export const GOAL_EDITOR_PRESET_BUTTON_CLASS =
  "h-10 rounded-2xl border border-white/10 bg-[#262d2a] text-sm font-medium text-foreground shadow-none hover:bg-[#303833]";

export const GOAL_EDITOR_SAVE_BUTTON_CLASS =
  "h-9 flex-1 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_0_20px_rgba(190,255,0,0.22)] hover:bg-primary/90 sm:h-10";

type MemberDashboardGoalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  eyebrow?: string;
  presentation?: "water" | "weekly";
  children: React.ReactNode;
  onSave: () => void | Promise<void>;
  saving?: boolean;
  saveDisabled?: boolean;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
};

export function MemberDashboardGoalDialog({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  presentation,
  children,
  onSave,
  saving = false,
  saveDisabled = false,
  returnFocusRef,
  initialFocusRef,
}: MemberDashboardGoalDialogProps) {
  const reducedMotion = usePrefersReducedMotion();
  const isReference = presentation === "water" || presentation === "weekly";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-0.75rem)] max-w-[calc(100vw-1rem)] gap-0 overflow-x-hidden p-0 sm:max-w-[22.5rem] sm:rounded-[1.35rem]",
          isReference &&
            "overflow-y-auto overscroll-contain sm:overflow-y-visible",
          !isReference && "overflow-y-auto",
          isReference && GOAL_EDITOR_MODAL_CLASS,
          !isReference &&
            "gap-4 border-border/80 bg-card p-5 shadow-2xl sm:max-w-md sm:rounded-2xl",
          !reducedMotion &&
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          presentation === "water" && "ring-1 ring-[#8EDBFF]/15",
          presentation === "weekly" && "ring-1 ring-primary/15",
        )}
        onOpenAutoFocus={(event) => {
          if (initialFocusRef?.current) {
            event.preventDefault();
            initialFocusRef.current.focus();
          }
        }}
        onCloseAutoFocus={(event) => {
          if (returnFocusRef?.current) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
      >
        <div
          className={cn(
            isReference ? "space-y-2.5 px-3.5 pb-2 pt-3.5 sm:space-y-3 sm:px-4 sm:pb-2.5 sm:pt-4" : "contents",
          )}
        >
          <DialogHeader
            className={cn(
              "space-y-1 pr-8 text-left",
              isReference && "space-y-1",
            )}
          >
            {eyebrow ? (
              <p className={GOAL_EDITOR_EYEBROW_CLASS}>{eyebrow}</p>
            ) : null}
            <DialogTitle
              className={cn(
                "font-display text-foreground",
                isReference
                  ? "text-lg font-bold tracking-tight sm:text-xl"
                  : "text-lg",
              )}
            >
              {title}
            </DialogTitle>
            {description && !isReference ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>

          <div className={cn(isReference && "space-y-2.5 sm:space-y-3")}>
            {children}
          </div>
        </div>

        <DialogFooter
          className={cn(
            isReference
              ? "grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] gap-2 border-t border-white/5 px-3.5 py-3 sm:gap-2.5 sm:px-4 sm:py-3.5 sm:space-x-0"
              : "gap-2 sm:gap-2",
            !isReference && "p-5 pt-0",
          )}
        >
          <Button
            type="button"
            variant="outline"
            className={cn(
              isReference
                ? GOAL_EDITOR_SECONDARY_BUTTON_CLASS
                : "rounded-xl",
            )}
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn(
              isReference ? GOAL_EDITOR_SAVE_BUTTON_CLASS : "rounded-xl",
            )}
            onClick={() => void onSave()}
            disabled={saving || saveDisabled}
          >
            {presentation === "water" ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/15"
                  aria-hidden
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-primary-foreground" />
                </span>
                {saving ? "Saving…" : "Save goal"}
              </span>
            ) : presentation === "weekly" ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/15 text-xs font-bold leading-none text-primary-foreground"
                  aria-hidden
                >
                  ↓
                </span>
                {saving ? "Saving…" : "Save goal"}
              </span>
            ) : saving ? (
              "Saving…"
            ) : (
              "Save goal"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
