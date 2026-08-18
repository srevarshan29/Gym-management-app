"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play } from "lucide-react";

import { startWorkoutSession } from "@/app/actions/workout-sessions";
import { Button } from "@/components/ui/button";
import { useActionLock } from "@/hooks/use-action-lock";

type TodaysWorkoutStartButtonProps = {
  dayId: string | null;
  label: string;
};

export function TodaysWorkoutStartButton({
  dayId,
  label,
}: TodaysWorkoutStartButtonProps) {
  const router = useRouter();
  const { run, isPending: pending } = useActionLock();

  async function onStart() {
    if (pending) return;
    await run(async () => {
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
      }
    });
  }

  return (
    <Button className="w-full gap-2" onClick={onStart} disabled={pending}>
      <Play className="h-4 w-4" />
      {pending ? "Starting..." : label}
    </Button>
  );
}
