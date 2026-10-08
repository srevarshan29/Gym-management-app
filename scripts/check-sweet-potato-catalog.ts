/**
 * Usage: node --env-file=.env --import tsx scripts/check-sweet-potato-catalog.ts
 */
import { getRepositories, platformContext } from "@/lib/firestore";
import { searchNutritionFoodCatalog } from "@/lib/nutrition/member-day";

async function main() {
  const { nutritionFoodCatalog } = getRepositories();
  const repaired = await nutritionFoodCatalog.getByFoodId(
    platformContext,
    "usda:168015",
  );
  console.log(
    "repaired doc:",
    repaired
      ? {
          name: repaired.name,
          displayName: repaired.displayName,
          canonicalKey: repaired.canonicalKey,
          isActive: repaired.isActive,
          sweePrefixes: repaired.searchPrefixes?.filter((p) =>
            p.startsWith("swe"),
          ),
        }
      : null,
  );
  const merged = await nutritionFoodCatalog.searchByQuery(platformContext, {
    query: "sweet potato",
    limit: 96,
  });
  console.log(
    "sweet potato candidates",
    merged.length,
    merged.some((row) => row.foodId === "usda:168482"),
  );

  const swee = await nutritionFoodCatalog.searchByQuery(platformContext, {
    query: "swee",
    limit: 48,
  });
  const sweetPotatoCandidates = swee.filter((row) =>
    /sweet potato/i.test(row.name),
  );
  console.log(
    JSON.stringify(
      {
        sweeCandidateCount: swee.length,
        sweetPotatoInSweeCandidates: sweetPotatoCandidates.length,
        sampleSweetPotatoNames: sweetPotatoCandidates
          .slice(0, 5)
          .map((r) => ({ foodId: r.foodId, name: r.name, active: r.isActive })),
      },
      null,
      2,
    ),
  );

  const nameRange = await nutritionFoodCatalog.searchByQuery(platformContext, {
    query: "potato",
    limit: 96,
  });
  const sweetInPotato = nameRange.filter((r) => /sweet/i.test(r.name));
  console.log(
    "sweet* in potato-token candidates:",
    sweetInPotato.map((r) => `${r.foodId}: ${r.name}`).slice(0, 8),
  );

  for (const query of ["swee", "sweet potato", "pota"]) {
    const ranked = await searchNutritionFoodCatalog(query);
    console.log(
      `\nRanked "${query}":`,
      ranked.map((r) => r.name).join(" | ") || "(none)",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
