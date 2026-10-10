import { cn } from "@/lib/utils";

const STEPS = [
  "Create workout",
  "Add exercises",
  "Save",
  "Start",
] as const;

type MemberWorkoutFlowStepsProps = {
  className?: string;
};

export function MemberWorkoutFlowSteps({ className }: MemberWorkoutFlowStepsProps) {
  return (
    <ol
      className={cn(
        "flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {STEPS.map((step, index) => (
        <li
          key={step}
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-2.5 py-1"
        >
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] text-primary"
          >
            {index + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}
