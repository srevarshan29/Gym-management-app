import { cn } from "@/lib/utils";

type CalculatorResultCardProps = {
  label: string;
  value: string;
  subtitle?: string;
  className?: string;
};

export function CalculatorResultCard({
  label,
  value,
  subtitle,
  className,
}: CalculatorResultCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/40 bg-card/90 px-6 py-8 text-center shadow-soft ring-1 ring-primary/20",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-4xl font-bold tracking-tight text-primary">
        {value}
      </p>
      {subtitle ? (
        <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-primary">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
