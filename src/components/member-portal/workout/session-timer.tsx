"use client";

import * as React from "react";
import { Clock } from "lucide-react";

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function SessionTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
      <Clock className="h-5 w-5 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">Session time</p>
        <p className="font-mono text-xl font-semibold text-primary">
          {formatElapsed(elapsed)}
        </p>
      </div>
    </div>
  );
}
