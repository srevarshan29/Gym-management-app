import { describe, expect, it } from "vitest";

import {
  assertValidWeightKg,
  computeWeightJourneyProgressPercent,
  deriveWeightJourney,
} from "@/lib/weight-journey/progress";
import { pointOnWeightJourneyTrail } from "@/components/member-portal/weight-journey/mountain-climb-visual";

describe("assertValidWeightKg", () => {
  it("accepts decimal kg within range", () => {
    expect(assertValidWeightKg(72.4)).toBe(72.4);
  });

  it("rejects invalid measurements", () => {
    expect(() => assertValidWeightKg(10)).toThrow();
    expect(() => assertValidWeightKg(600)).toThrow();
    expect(() => assertValidWeightKg(Number.NaN)).toThrow();
  });
});

describe("computeWeightJourneyProgressPercent", () => {
  it("calculates weight-loss progress", () => {
    expect(computeWeightJourneyProgressPercent(90, 85, 80)).toBeCloseTo(50, 5);
    expect(computeWeightJourneyProgressPercent(90, 80, 80)).toBe(100);
    expect(computeWeightJourneyProgressPercent(90, 95, 80)).toBe(0);
  });

  it("calculates weight-gain progress", () => {
    expect(computeWeightJourneyProgressPercent(60, 65, 70)).toBeCloseTo(50, 5);
    expect(computeWeightJourneyProgressPercent(60, 70, 70)).toBe(100);
    expect(computeWeightJourneyProgressPercent(60, 58, 70)).toBe(0);
  });

  it("allows backward movement without negative progress", () => {
    const first = computeWeightJourneyProgressPercent(90, 82, 75);
    const regressed = computeWeightJourneyProgressPercent(90, 86, 75);
    expect(first).toBeGreaterThan(regressed);
    expect(regressed).toBeGreaterThanOrEqual(0);
  });

  it("handles equal start and target", () => {
    expect(computeWeightJourneyProgressPercent(80, 80, 80)).toBe(100);
    expect(computeWeightJourneyProgressPercent(80, 82, 80)).toBe(0);
  });
});

describe("deriveWeightJourney", () => {
  it("uses earliest and latest measurements", () => {
    const derived = deriveWeightJourney(
      [
        { weightKg: 90, recordedAtMs: 1 },
        { weightKg: 88, recordedAtMs: 2 },
        { weightKg: 87, recordedAtMs: 3 },
      ],
      80,
    );
    expect(derived.startingWeightKg).toBe(90);
    expect(derived.currentWeightKg).toBe(87);
    expect(derived.progressPercent).toBeCloseTo(30, 5);
    expect(derived.startingWeightIsCustom).toBe(false);
  });

  it("uses custom trailhead when set", () => {
    const derived = deriveWeightJourney(
      [
        { weightKg: 90, recordedAtMs: 1 },
        { weightKg: 87, recordedAtMs: 2 },
      ],
      80,
      95,
    );
    expect(derived.startingWeightKg).toBe(95);
    expect(derived.currentWeightKg).toBe(87);
    expect(derived.startingWeightIsCustom).toBe(true);
    expect(derived.progressPercent).toBeCloseTo(53.33, 1);
  });

  it("preserves history semantics for multiple entries", () => {
    const derived = deriveWeightJourney(
      [
        { weightKg: 70, recordedAtMs: 10 },
        { weightKg: 72, recordedAtMs: 20 },
      ],
      75,
    );
    expect(derived.startingWeightKg).toBe(70);
    expect(derived.currentWeightKg).toBe(72);
    expect(derived.direction).toBe("gain");
  });

  it("supports legacy members without records", () => {
    const derived = deriveWeightJourney([], null);
    expect(derived.hasMeasurements).toBe(false);
    expect(derived.startingWeightKg).toBeNull();
    expect(derived.progressPercent).toBe(0);
    expect(derived.startingWeightIsCustom).toBe(false);
  });

  it("allows trailhead before any logs", () => {
    const derived = deriveWeightJourney([], 70, 80);
    expect(derived.startingWeightKg).toBe(80);
    expect(derived.currentWeightKg).toBeNull();
    expect(derived.hasMeasurements).toBe(false);
    expect(derived.startingWeightIsCustom).toBe(true);
  });
});

describe("mountain trail marker", () => {
  it("moves along trail with progress", () => {
    const start = pointOnWeightJourneyTrail(0);
    const end = pointOnWeightJourneyTrail(100);
    expect(start[1]).toBeGreaterThan(end[1]);
    const mid = pointOnWeightJourneyTrail(50);
    expect(mid[1]).toBeLessThan(start[1]);
    expect(mid[1]).toBeGreaterThan(end[1]);
  });

  it("places marker at quarter intervals ascending toward summit", () => {
    const samples = [0, 25, 50, 75, 100].map((p) => pointOnWeightJourneyTrail(p));
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]![1]).toBeLessThanOrEqual(samples[i - 1]![1] + 2);
    }
    expect(samples[4]![0]).toBeCloseTo(312, 0);
    expect(samples[4]![1]).toBeLessThan(52);
  });
});
