"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play } from "lucide-react";

import { startWorkoutSession } from "@/app/actions/workout-sessions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
type TodaysWorkoutStartButtonProps = {
  dayId: string | null;
  label: string;
  className?: string;
};

export function TodaysWorkoutStartButton({
  dayId,
  label,
  className,
}: TodaysWorkoutStartButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function onStart() {
    if (pending) return;
    setPending(true);
    try {
      const result = await startWorkoutSession(dayId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Workout started.");
      router.push("/member/workout");
      router.refresh();
    } catch (error) {
      console.error("[workout] overview startWorkoutSession failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start workout. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      className={cn("w-full gap-2", className)}
      onClick={onStart}
      disabled={pending}
    >
      <Play className="h-4 w-4" />
      {pending ? "Starting..." : label}
    </Button>
  );
}
