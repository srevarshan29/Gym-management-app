"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Crosshair,
  Dumbbell,
  Flag,
  Flame,
  Mountain,
  Scale,
  TrendingUp,
} from "lucide-react";

import {
  logMemberWeightMeasurementAction,
  setMemberWeightJourneyStartAction,
  setMemberWeightJourneyTargetAction,
} from "@/app/actions/member-weight-journey";
import { MountainClimbVisual } from "@/components/member-portal/weight-journey/mountain-climb-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WeightJourneySnapshot } from "@/lib/weight-journey/load-snapshot";
import { cn, formatDate } from "@/lib/utils";

type Props = {
  snapshot: WeightJourneySnapshot;
  readOnly?: boolean;
};

function formatKg(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)} kg`;
}

function remainingKg(snapshot: WeightJourneySnapshot): number | null {
  if (snapshot.currentWeightKg == null || snapshot.targetWeightKg == null) {
    return null;
  }
  return Math.abs(snapshot.currentWeightKg - snapshot.targetWeightKg);
}

function weightDelta(snapshot: WeightJourneySnapshot): {
  amount: number;
  label: string;
} | null {
  if (
    snapshot.startingWeightKg == null ||
    snapshot.currentWeightKg == null
  ) {
    return null;
  }
  const diff = snapshot.currentWeightKg - snapshot.startingWeightKg;
  const amount = Math.abs(diff);
  if (amount < 0.05) return { amount: 0, label: "No change yet" };
  if (diff < 0) return { amount, label: "loss" };
  return { amount, label: "gain" };
}

export function MemberWeightJourneyPanel({ snapshot, readOnly = false }: Props) {
  const [weightInput, setWeightInput] = React.useState("");
  const [targetInput, setTargetInput] = React.useState(
    snapshot.targetWeightKg != null ? String(snapshot.targetWeightKg) : "",
  );
  const [startInput, setStartInput] = React.useState(() => {
    if (snapshot.weightJourneyStartKg != null) {
      return String(snapshot.weightJourneyStartKg);
    }
    if (snapshot.startingWeightKg != null) {
      return String(snapshot.startingWeightKg);
    }
    return "";
  });
  const [pending, setPending] = React.useState(false);

  const progressRounded = Math.round(snapshot.progressPercent);
  const remaining = remainingKg(snapshot);
  const delta = weightDelta(snapshot);
  const targetLabel =
    snapshot.targetWeightKg != null
      ? `${snapshot.targetWeightKg.toFixed(1)} kg`
      : null;
  const startLabel =
    snapshot.startingWeightKg != null
      ? `${snapshot.startingWeightKg.toFixed(1)} kg`
      : null;

  async function handleLogWeight(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setPending(true);
    const result = await logMemberWeightMeasurementAction({
      weightKg: Number(weightInput),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Weight logged.");
    setWeightInput("");
  }

  async function handleSaveTarget(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setPending(true);
    const result = await setMemberWeightJourneyTargetAction({
      targetKg: Number(targetInput),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Target updated.");
  }

  async function handleSaveStart(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setPending(true);
    const trimmed = startInput.trim();
    const result = await setMemberWeightJourneyStartAction({
      startKg: trimmed === "" ? null : Number(trimmed),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      trimmed === ""
        ? "Trailhead reset to your first log."
        : "Starting weight updated.",
    );
  }

  async function handleResetStart() {
    if (readOnly) return;
    setStartInput("");
    setPending(true);
    const result = await setMemberWeightJourneyStartAction({ startKg: null });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Trailhead reset to your first log.");
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-white/5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)] ring-1 ring-white/5">
        <header className="space-y-0.5 bg-[#0a1210] px-4 pb-2 pt-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Your climb
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Weight Journey
          </h1>
        </header>
        <MountainClimbVisual
          progressPercent={snapshot.progressPercent}
          targetLabel={targetLabel}
          startLabel={startLabel}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/50 bg-[#0b100e] shadow-soft ring-1 ring-white/5">
        <div className="grid grid-cols-3 divide-x divide-border/40 border-b border-border/40">
          <MetricTile
            icon={Flag}
            label="Starting"
            value={formatKg(snapshot.startingWeightKg)}
          />
          <MetricTile
            icon={Dumbbell}
            label="Latest"
            value={formatKg(snapshot.currentWeightKg)}
            highlight
          />
          <MetricTile
            icon={Crosshair}
            label="Target"
            value={formatKg(snapshot.targetWeightKg)}
          />
        </div>

        <div className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-3">
          <p className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-mono font-semibold text-primary">
                {snapshot.targetWeightKg != null ? `${progressRounded}%` : "—"}
              </span>{" "}
              complete
            </span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Mountain className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {remaining != null ? (
                <>
                  <span className="font-mono text-foreground">
                    {remaining.toFixed(1)} kg
                  </span>{" "}
                  to go
                </>
              ) : (
                "Set a target"
              )}
            </span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Flame className="h-4 w-4 shrink-0" aria-hidden />
            {delta ? (
              <span className="inline-flex items-center gap-1">
                {delta.label === "gain" ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : delta.label === "loss" ? (
                  <ArrowDown className="h-3.5 w-3.5" />
                ) : null}
                <span className="font-mono text-foreground">
                  {delta.amount.toFixed(1)} kg
                </span>{" "}
                {delta.label === "No change yet" ? delta.label : delta.label}
              </span>
            ) : (
              <span>—</span>
            )}
          </p>
        </div>
      </div>

      {snapshot.currentWeightKg != null ? (
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Latest weight and trail progress are calculated separately — small
          fluctuations are normal.
        </p>
      ) : null}

      {!readOnly ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <form
            onSubmit={handleLogWeight}
            className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-soft sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" aria-hidden />
              <p className="text-sm font-semibold">Log weight</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Record whenever you like — no daily streak.
            </p>
            <div className="mt-3 flex gap-2">
              <div className="min-w-0 flex-1">
                <Label htmlFor="wj-weight" className="sr-only">
                  Weight (kg)
                </Label>
                <Input
                  id="wj-weight"
                  type="number"
                  min={20}
                  max={500}
                  step={0.1}
                  inputMode="decimal"
                  placeholder="e.g. 72.5"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  required
                  className="font-mono"
                />
              </div>
              <Button type="submit" disabled={pending} className="shrink-0">
                {pending ? "Saving…" : "Log"}
              </Button>
            </div>
          </form>

          <form
            onSubmit={handleSaveStart}
            className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-soft"
          >
            <p className="text-sm font-semibold">Trailhead start</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Set where your climb begins. Leave blank to use your first log.
              {snapshot.startingWeightIsCustom ? " (custom)" : null}
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                type="number"
                min={20}
                max={500}
                step={0.1}
                inputMode="decimal"
                placeholder="Starting kg"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="font-mono"
                aria-label="Starting weight in kg"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={pending}
                className="shrink-0"
              >
                Save
              </Button>
            </div>
            {snapshot.weightJourneyStartKg != null ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-8 px-2 text-xs text-muted-foreground"
                disabled={pending}
                onClick={() => void handleResetStart()}
              >
                Reset to first log
              </Button>
            ) : null}
          </form>

          <form
            onSubmit={handleSaveTarget}
            className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-soft"
          >
            <p className="text-sm font-semibold">Summit target</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Moves the flag — your trail recalculates instantly.
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                type="number"
                min={20}
                max={500}
                step={0.1}
                inputMode="decimal"
                placeholder="Target kg"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                required
                className="font-mono"
                aria-label="Target weight in kg"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={pending}
                className="shrink-0"
              >
                Save
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-soft">
        <p className="text-sm font-semibold">Measurement history</p>
        {snapshot.history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No measurements yet. Log your first weight at the trailhead.
          </p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-0 overflow-y-auto">
            {snapshot.history.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between border-b border-border/40 py-2.5 text-sm last:border-0"
              >
                <span className="font-mono text-base font-semibold tabular-nums text-foreground">
                  {row.weightKg.toFixed(1)} kg
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(row.recordedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-3 py-5 text-center",
        highlight && "bg-primary/[0.06] shadow-[inset_0_-12px_24px_-20px_rgba(182,255,0,0.9)]",
      )}
    >
      <Icon
        className={cn(
          "mb-2 h-4 w-4",
          highlight ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden
      />
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono font-bold tabular-nums tracking-tight",
          highlight ? "text-2xl text-primary" : "text-lg text-foreground/90",
        )}
      >
        {value}
      </p>
    </div>
  );
}
