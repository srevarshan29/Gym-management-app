"use client";

import * as React from "react";

import { CalculatorResultCard } from "@/components/member-portal/tools/calculator-result-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateProtein } from "@/lib/fitness-calculators";

type ProteinCalculatorProps = {
  initialWeightKg?: number | null;
};

export function ProteinCalculator({ initialWeightKg }: ProteinCalculatorProps) {
  const [weight, setWeight] = React.useState(
    initialWeightKg != null ? String(initialWeightKg) : "",
  );
  const [result, setResult] = React.useState<{
    minG: number;
    maxG: number;
    idealG: number;
  } | null>(null);

  function onCalculate(e: React.FormEvent) {
    e.preventDefault();
    const weightKg = Number(weight);
    if (!weightKg || weightKg < 20 || weightKg > 500) {
      setResult(null);
      return;
    }
    setResult(calculateProtein(weightKg));
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Based on{" "}
        <span className="font-medium text-primary">1.6g – 2.0g per kg</span> of
        body weight for active individuals building or maintaining muscle.
      </p>

      <form onSubmit={onCalculate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="protein-weight">Your weight (kg)</Label>
          <Input
            id="protein-weight"
            type="number"
            min={20}
            max={500}
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="62"
          />
        </div>
        <Button type="submit" className="w-full">
          Calculate protein
        </Button>
      </form>

      {result ? (
        <div className="space-y-3">
          <CalculatorResultCard
            label="Your daily protein intake"
            value={`${result.minG}g – ${result.maxG}g`}
          />
          <p className="text-center text-sm text-muted-foreground">
            Ideal target:{" "}
            <span className="font-mono font-semibold text-primary">
              {result.idealG}g
            </span>{" "}
            per day
          </p>
        </div>
      ) : null}
    </div>
  );
}
