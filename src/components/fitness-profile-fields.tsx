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

type FitnessProfileFieldsProps = {
  fitnessGoal: FitnessGoal | "";
  onFitnessGoalChange: (value: FitnessGoal) => void;
  fitnessGoalRequired?: boolean;
  defaultAgeYears?: number | null;
  defaultHeightCm?: number | null;
  defaultWeightKg?: number | null;
};

export function FitnessProfileFields({
  fitnessGoal,
  onFitnessGoalChange,
  fitnessGoalRequired = false,
  defaultAgeYears,
  defaultHeightCm,
  defaultWeightKg,
}: FitnessProfileFieldsProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Fitness profile</p>
        <p className="text-xs text-muted-foreground">
          Used in member portal calculators. Body stats are optional.
        </p>
      </div>

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
          <SelectTrigger id="fitnessGoal">
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ageYears">Age (years, optional)</Label>
          <Input
            id="ageYears"
            name="ageYears"
            type="number"
            min={1}
            max={120}
            defaultValue={defaultAgeYears ?? ""}
            placeholder="—"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heightCm">Height (cm, optional)</Label>
          <Input
            id="heightCm"
            name="heightCm"
            type="number"
            min={50}
            max={300}
            defaultValue={defaultHeightCm ?? ""}
            placeholder="—"
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
            placeholder="—"
          />
        </div>
      </div>
    </div>
  );
}
