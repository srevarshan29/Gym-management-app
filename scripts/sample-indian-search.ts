/**
 * Usage: node --env-file=.env --import tsx scripts/sample-indian-search.ts
 */
import { searchNutritionFoodCatalog } from "@/lib/nutrition/member-day";

const QUERIES = [
  "dosa",
  "idli",
  "sambar",
  "pongal",
  "upma",
  "vada",
  "chapati",
  "paneer",
  "dal",
  "rice",
];

async function main() {
  for (const query of QUERIES) {
    const results = await searchNutritionFoodCatalog(query);
    console.log(
      `"${query}" (${results.length}):`,
      results.map((r) => r.name).join(" | ") || "(none)",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
