/**
 * Usage: node --env-file=.env --import tsx scripts/sample-short-search.ts
 */
import { searchNutritionFoodCatalog } from "@/lib/nutrition/member-day";

const QUERIES = ["ch", "do", "id", "sa", "CHICKEN", "toor dal"];

async function main() {
  for (const query of QUERIES) {
    const results = await searchNutritionFoodCatalog(query);
    console.log(
      `"${query}" (${results.length}):`,
      results.map((r) => r.name).join(" | ") || "(none)",
    );
  }
}

main();
