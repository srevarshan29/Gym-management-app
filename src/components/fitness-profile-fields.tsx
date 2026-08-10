"use client";

import type { FitnessGoal } from "@prisma/client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FITNESS_GOAL_OPTIONS } from "@/lib/fitness-goal";
import { cn } from "@/lib/utils";

type FitnessProfileFieldsProps = {
  fitnessGoal: FitnessGoal | "";
  onFitnessGoalChange: (value: FitnessGoal) => void;
  fitnessGoalRequired?: boolean;
  defaultAgeYears?: number | null;
  defaultHeightCm?: number | null;
  defaultWeightKg?: number | null;
  variant?: "default" | "embedded";
};

export function FitnessProfileFields({
  fitnessGoal,
  onFitnessGoalChange,
  fitnessGoalRequired = false,
  defaultAgeYears,
  defaultHeightCm,
  defaultWeightKg,
  variant = "default",
}: FitnessProfileFieldsProps) {
  const embedded = variant === "embedded";

  return (
    <div
      className={cn(
        embedded ? "space-y-4" : "space-y-4 rounded-lg border p-4",
      )}
    >
      {!embedded ? (
        <div>
          <p className="text-sm font-medium">Fitness profile</p>
          <p className="text-xs text-muted-foreground">
            Used in member portal calculators. Body stats are optional.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="fitnessGoal">
          Fitness goal{fitnessGoalRequired ? "" : " (optional)"}
        </Label>
        <input type="hidden" name="fitnessGoal" value={fitnessGoal} />
        <Select
          value={fitnessGoal || undefined}
          onValueChange={(value) => onFitnessGoalChange(value as FitnessGoal)}
          required={fitnessGoalRequired}
        >
          <SelectTrigger
            id="fitnessGoal"
            className={embedded ? "bg-muted/40 focus:ring-primary" : undefined}
          >
            <SelectValue placeholder="Select your goal" />
          </SelectTrigger>
          <SelectContent>
            {FITNESS_GOAL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ageYears">Age (optional)</Label>
          <Input
            id="ageYears"
            name="ageYears"
            type="number"
            min={1}
            max={120}
            defaultValue={defaultAgeYears ?? ""}
            placeholder="Years"
            className={embedded ? "bg-muted/40 focus-visible:ring-primary" : undefined}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="heightCm">Height (cm, optional)</Label>
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              min={50}
              max={300}
              defaultValue={defaultHeightCm ?? ""}
              placeholder="cm"
              className={embedded ? "bg-muted/40 focus-visible:ring-primary" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weightKg">Weight (kg, optional)</Label>
            <Input
              id="weightKg"
              name="weightKg"
              type="number"
              min={20}
              max={500}
              step={0.1}
              defaultValue={
                defaultWeightKg != null ? String(defaultWeightKg) : ""
              }
              placeholder="kg"
              className={embedded ? "bg-muted/40 focus-visible:ring-primary" : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
