/**
 * Print ranked nutrition search samples (uses live Firestore catalog).
 * Usage: node --env-file=.env --import tsx scripts/sample-nutrition-search.ts
 */
import { searchNutritionFoodCatalog } from "@/lib/nutrition/member-day";

const QUERIES = [
  "egg",
  "swee",
  "sweet potato",
  "sweet potato leaves",
  "chic",
  "pota",
  "rice",
  "chicken",
  "banana",
];

async function main() {
  for (const query of QUERIES) {
    const results = await searchNutritionFoodCatalog(query);
    console.log(`\n"${query}" (${results.length} results):`);
    for (const row of results) {
      console.log(`  - ${row.name} (${row.foodId}, ${row.caloriesPer100g} kcal/100g)`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
