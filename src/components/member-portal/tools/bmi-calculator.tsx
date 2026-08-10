"use client";

import * as React from "react";

import { CalculatorResultCard } from "@/components/member-portal/tools/calculator-result-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bmiCategory,
  calculateBmi,
} from "@/lib/fitness-calculators";

type BmiCalculatorProps = {
  initialWeightKg?: number | null;
  initialHeightCm?: number | null;
};

export function BmiCalculator({
  initialWeightKg,
  initialHeightCm,
}: BmiCalculatorProps) {
  const [weight, setWeight] = React.useState(
    initialWeightKg != null ? String(initialWeightKg) : "",
  );
  const [height, setHeight] = React.useState(
    initialHeightCm != null ? String(initialHeightCm) : "",
  );
  const [result, setResult] = React.useState<{
    bmi: number;
    category: string;
  } | null>(null);

  function onCalculate(e: React.FormEvent) {
    e.preventDefault();
    const weightKg = Number(weight);
    const heightCm = Number(height);
    if (
      !weightKg ||
      !heightCm ||
      weightKg < 20 ||
      weightKg > 500 ||
      heightCm < 50 ||
      heightCm > 300
    ) {
      setResult(null);
      return;
    }
    const bmi = calculateBmi(weightKg, heightCm);
    setResult({ bmi, category: bmiCategory(bmi) });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCalculate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bmi-height">Height (cm)</Label>
          <Input
            id="bmi-height"
            type="number"
            min={50}
            max={300}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="170"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bmi-weight">Weight (kg)</Label>
          <Input
            id="bmi-weight"
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
          Calculate BMI
        </Button>
      </form>

      {result ? (
        <CalculatorResultCard
          label="Your BMI"
          value={result.bmi.toFixed(1)}
          subtitle={result.category}
        />
      ) : null}
    </div>
  );
}
