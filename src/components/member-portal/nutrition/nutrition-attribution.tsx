import { USDA_FOODDATA_CENTRAL_ATTRIBUTION } from "@/lib/nutrition/attribution";

export function NutritionAttribution() {
  return (
    <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
      Nutrition data source:{" "}
      <a
        href={USDA_FOODDATA_CENTRAL_ATTRIBUTION.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-2 hover:underline"
      >
        {USDA_FOODDATA_CENTRAL_ATTRIBUTION.title}
      </a>
      . {USDA_FOODDATA_CENTRAL_ATTRIBUTION.citation}
    </p>
  );
}
