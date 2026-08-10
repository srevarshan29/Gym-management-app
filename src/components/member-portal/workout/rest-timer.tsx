"use client";

import * as React from "react";
import { Timer } from "lucide-react";

import { Button } from "@/components/ui/button";

const PRESETS = [60, 90, 120] as const;

type RestTimerProps = {
  defaultSeconds?: number | null;
};

export function RestTimer({ defaultSeconds }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (secondsLeft == null || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev == null || prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  function start(seconds: number) {
    setSecondsLeft(seconds);
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Timer className="h-4 w-4 text-primary" />
        Rest timer
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((seconds) => (
          <Button
            key={seconds}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => start(seconds)}
          >
            {seconds}s
          </Button>
        ))}
        {defaultSeconds ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => start(defaultSeconds)}
          >
            Plan ({defaultSeconds}s)
          </Button>
        ) : null}
      </div>
      {secondsLeft != null ? (
        <p className="mt-3 text-center font-mono text-2xl text-primary">
          {secondsLeft > 0 ? `${secondsLeft}s` : "Rest complete"}
        </p>
      ) : null}
    </div>
  );
}
