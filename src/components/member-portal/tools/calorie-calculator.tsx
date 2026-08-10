"use client";

import * as React from "react";
import type { FitnessGoal, MemberGender } from "@prisma/client";

import { CalculatorResultCard } from "@/components/member-portal/tools/calculator-result-card";
import { Button } from "@/components/ui/button";
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
import {
  bmrSexFromGender,
  calculateDailyCalories,
  type BmrSex,
} from "@/lib/fitness-calculators";

type CalorieCalculatorProps = {
  initialWeightKg?: number | null;
  initialHeightCm?: number | null;
  initialAgeYears?: number | null;
  initialFitnessGoal?: FitnessGoal | null;
  gender: MemberGender;
};

function defaultBmrSex(gender: MemberGender): BmrSex | "" {
  const fromGender = bmrSexFromGender(gender);
  return fromGender ?? "";
}

export function CalorieCalculator({
  initialWeightKg,
  initialHeightCm,
  initialAgeYears,
  initialFitnessGoal,
  gender,
}: CalorieCalculatorProps) {
  const [weight, setWeight] = React.useState(
    initialWeightKg != null ? String(initialWeightKg) : "",
  );
  const [height, setHeight] = React.useState(
    initialHeightCm != null ? String(initialHeightCm) : "",
  );
  const [age, setAge] = React.useState(
    initialAgeYears != null ? String(initialAgeYears) : "",
  );
  const [goal, setGoal] = React.useState<FitnessGoal | "">(
    initialFitnessGoal ?? "",
  );
  const [bmrSex, setBmrSex] = React.useState<BmrSex | "">(
    defaultBmrSex(gender),
  );
  const [result, setResult] = React.useState<number | null>(null);
  const [usedAverage, setUsedAverage] = React.useState(false);

  function onCalculate(e: React.FormEvent) {
    e.preventDefault();
    const weightKg = Number(weight);
    const heightCm = Number(height);
    const ageYears = Number(age);
    if (
      !goal ||
      !weightKg ||
      !heightCm ||
      !ageYears ||
      weightKg < 20 ||
      weightKg > 500 ||
      heightCm < 50 ||
      heightCm > 300 ||
      ageYears < 1 ||
      ageYears > 120
    ) {
      setResult(null);
      return;
    }

    const sex: BmrSex | "AVERAGE" = bmrSex || "AVERAGE";
    setUsedAverage(sex === "AVERAGE");
    setResult(
      calculateDailyCalories(weightKg, heightCm, ageYears, goal, sex),
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Uses the Mifflin-St Jeor equation with a lightly active activity
        factor, adjusted for your fitness goal.
      </p>

      <form onSubmit={onCalculate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cal-weight">Weight (kg)</Label>
          <Input
            id="cal-weight"
            type="number"
            min={20}
            max={500}
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cal-height">Height (cm)</Label>
          <Input
            id="cal-height"
            type="number"
            min={50}
            max={300}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cal-age">Age (years)</Label>
          <Input
            id="cal-age"
            type="number"
            min={1}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cal-goal">Fitness goal</Label>
          <Select
            value={goal || undefined}
            onValueChange={(v) => setGoal(v as FitnessGoal)}
          >
            <SelectTrigger id="cal-goal">
              <SelectValue placeholder="Select goal" />
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
        <div className="space-y-2">
          <Label htmlFor="cal-sex">Sex for BMR calculation</Label>
          <Select
            value={bmrSex || "__average__"}
            onValueChange={(v) =>
              setBmrSex(v === "__average__" ? "" : (v as BmrSex))
            }
          >
            <SelectTrigger id="cal-sex">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="__average__">Average estimate</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Pre-filled from your profile when available. Only affects this
            calculation — not saved to your profile.
          </p>
        </div>
        <Button type="submit" className="w-full">
          Calculate calories
        </Button>
      </form>

      {result != null ? (
        <div className="space-y-3">
          <CalculatorResultCard
            label="Your daily calorie target"
            value={`${result} kcal`}
            subtitle="per day"
          />
          {usedAverage ? (
            <p className="text-center text-xs text-muted-foreground">
              Using an average BMR estimate. Select Male or Female above for a
              more accurate result.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
