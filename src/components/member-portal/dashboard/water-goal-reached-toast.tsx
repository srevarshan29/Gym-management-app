"use client";



import * as React from "react";

import { Check } from "lucide-react";



import { usePrefersReducedMotion } from "@/components/member-portal/dashboard/use-prefers-reduced-motion";

import { cn } from "@/lib/utils";



type WaterGoalReachedToastProps = {

  open: boolean;

  onDismiss: () => void;

};



const VISIBLE_MS = 4000;

const EXIT_MS = 300;



export function WaterGoalReachedToast({

  open,

  onDismiss,

}: WaterGoalReachedToastProps) {

  const reducedMotion = usePrefersReducedMotion();

  const [phase, setPhase] = React.useState<"closed" | "open" | "closing">(

    "closed",

  );



  React.useEffect(() => {

    if (!open) {

      setPhase("closed");

      return;

    }

    setPhase("open");

    const visibleTimer = window.setTimeout(() => {

      setPhase("closing");

    }, VISIBLE_MS);

    return () => window.clearTimeout(visibleTimer);

  }, [open]);



  React.useEffect(() => {

    if (phase !== "closing") return;

    const exitTimer = window.setTimeout(() => {

      onDismiss();

      setPhase("closed");

    }, reducedMotion ? 0 : EXIT_MS);

    return () => window.clearTimeout(exitTimer);

  }, [phase, onDismiss, reducedMotion]);



  if (phase === "closed") return null;



  return (

    <div

      className="pointer-events-none fixed inset-x-0 z-40 px-4"

      style={{

        bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))",

      }}

      role="status"

      aria-live="polite"

    >

      <div

        className={cn(

          "pointer-events-auto mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-border/80 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm",

          phase === "open" &&

            !reducedMotion &&

            "animate-dashboard-toast-in",

          phase === "closing" &&

            !reducedMotion &&

            "animate-dashboard-toast-out",

        )}

      >

        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">

          <Check className="h-4 w-4 text-primary" strokeWidth={2.5} aria-hidden />

        </div>

        <div className="min-w-0 pt-0.5">

          <p className="text-sm font-semibold leading-tight">Water goal reached</p>

          <p className="mt-0.5 text-xs text-muted-foreground">

            Great job staying hydrated.

          </p>

        </div>

      </div>

    </div>

  );

}


