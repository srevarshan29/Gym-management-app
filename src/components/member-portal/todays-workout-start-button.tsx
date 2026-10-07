"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play } from "lucide-react";

import { startWorkoutSession } from "@/app/actions/workout-sessions";
import { Button } from "@/components/ui/button";
type TodaysWorkoutStartButtonProps = {
  dayId: string | null;
  label: string;
};

export function TodaysWorkoutStartButton({
  dayId,
  label,
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
    <Button className="w-full gap-2" onClick={onStart} disabled={pending}>
      <Play className="h-4 w-4" />
      {pending ? "Starting..." : label}
    </Button>
  );
}
