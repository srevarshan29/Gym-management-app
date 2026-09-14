"use client";

import * as React from "react";
import { Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  readRestTimerSnapshot,
  writeRestTimerSnapshot,
} from "@/lib/workout-tracking/rest-timer-storage";
import { cn } from "@/lib/utils";

const PRESETS = [60, 90, 120] as const;

type RestTimerProps = {
  sessionId: string;
  exerciseId: string;
  defaultSeconds?: number | null;
  compact?: boolean;
};

type RestTimerPhase = "idle" | "running" | "complete";

function secondsRemaining(endAt: number): number {
  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

export function RestTimer({
  sessionId,
  exerciseId,
  defaultSeconds,
  compact = false,
}: RestTimerProps) {
  const planSeconds =
    defaultSeconds && defaultSeconds > 0 ? defaultSeconds : 90;
  const [phase, setPhase] = React.useState<RestTimerPhase>("idle");
  const [secondsLeft, setSecondsLeft] = React.useState<number | null>(null);
  const [activeDuration, setActiveDuration] = React.useState(planSeconds);
  const endAtRef = React.useRef<number | null>(null);
  const activeDurationRef = React.useRef(activeDuration);
  const [runId, setRunId] = React.useState(0);

  React.useEffect(() => {
    activeDurationRef.current = activeDuration;
  }, [activeDuration]);

  React.useEffect(() => {
    setActiveDuration(planSeconds);
  }, [planSeconds]);

  const armCountdown = React.useCallback(
    (seconds: number, endAt: number, options?: { persist?: boolean }) => {
      endAtRef.current = endAt;
      setActiveDuration(seconds);
      setPhase("running");
      setSecondsLeft(secondsRemaining(endAt));
      setRunId((current) => current + 1);

      if (options?.persist !== false) {
        writeRestTimerSnapshot(sessionId, exerciseId, {
          phase: "running",
          activeDuration: seconds,
          endAt,
        });
      }
    },
    [exerciseId, sessionId],
  );

  const start = React.useCallback(
    (seconds: number) => {
      armCountdown(seconds, Date.now() + seconds * 1000);
    },
    [armCountdown],
  );

  React.useEffect(() => {
    const snapshot = readRestTimerSnapshot(sessionId, exerciseId);
    if (!snapshot) return;

    if (snapshot.phase === "complete") {
      endAtRef.current = null;
      setActiveDuration(snapshot.activeDuration);
      setPhase("complete");
      setSecondsLeft(0);
      return;
    }

    if (snapshot.endAt != null && snapshot.endAt > Date.now()) {
      armCountdown(snapshot.activeDuration, snapshot.endAt, {
        persist: false,
      });
    }
  }, [armCountdown, exerciseId, sessionId]);

  React.useEffect(() => {
    if (phase !== "running") return;

    const endAt = endAtRef.current;
    if (endAt == null) return;

    const tick = () => {
      const currentEndAt = endAtRef.current;
      if (currentEndAt == null) return;

      const left = secondsRemaining(currentEndAt);
      setSecondsLeft(left);

      if (left <= 0) {
        endAtRef.current = null;
        setPhase("complete");
        setSecondsLeft(0);
        writeRestTimerSnapshot(sessionId, exerciseId, {
          phase: "complete",
          activeDuration: activeDurationRef.current,
          endAt: null,
        });
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [exerciseId, phase, runId, sessionId]);

  const pillLabel =
    phase === "idle"
      ? `Start rest · ${planSeconds}s`
      : phase === "complete"
        ? "Rest complete · tap to restart"
        : `Rest timer · ${secondsLeft ?? activeDuration}s`;

  if (compact) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            if (phase === "running") {
              start(activeDuration);
              return;
            }
            start(planSeconds);
          }}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ring-1 ring-border/70 transition-colors",
            phase === "running"
              ? "bg-primary/10 text-primary ring-primary/30"
              : "bg-muted/80 text-foreground",
          )}
        >
          <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
          {pillLabel}
        </button>
        <div className="flex flex-wrap justify-center gap-1.5">
          {PRESETS.map((seconds) => (
            <Button
              key={seconds}
              type="button"
              size="sm"
              variant={
                phase === "running" && activeDuration === seconds
                  ? "default"
                  : "ghost"
              }
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => start(seconds)}
            >
              {seconds}s
            </Button>
          ))}
        </div>
      </div>
    );
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
          {phase === "complete" ? "Rest complete" : `${secondsLeft}s`}
        </p>
      ) : null}
    </div>
  );
}
