"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEP_LABELS = ["Basic Info", "Fitness Info", "Policy"] as const;

type RegistrationStepIndicatorProps = {
  currentStep: number;
  totalSteps: 2 | 3;
};

export function RegistrationStepIndicator({
  currentStep,
  totalSteps,
}: RegistrationStepIndicatorProps) {
  const steps = STEP_LABELS.slice(0, totalSteps);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-center">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                      "border-primary bg-primary text-primary-foreground",
                    !isCompleted &&
                      !isCurrent &&
                      "border-muted-foreground/40 bg-muted/30 text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={cn(
                    "max-w-[4.5rem] text-center text-[10px] font-medium leading-tight sm:max-w-none sm:text-xs",
                    isCurrent || isCompleted
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </div>

              {!isLast ? (
                <div
                  className={cn(
                    "mx-2 mb-5 h-0.5 w-8 sm:w-12",
                    stepNumber < currentStep ? "bg-primary" : "bg-muted",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
