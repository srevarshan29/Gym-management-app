/**
 * Production nutrition search diagnostic.
 * Usage: node --env-file=.env --import tsx scripts/diagnose-nutrition-search.ts
 */
import { performance } from "node:perf_hooks";

import { getFirestoreDb } from "@/lib/firebase/admin";
import { platformContext } from "@/lib/firestore";
import { NutritionFoodCatalogRepository } from "@/lib/firestore/repositories/nutrition-food-catalog";
import {
  passesNutritionSearchRelevanceGate,
  rankNutritionFoodSearchResults,
} from "@/lib/nutrition/food-search";
import { catalogDocToSearchResult } from "@/lib/nutrition/member-day";
import {
  countPlannedFirestoreQueries,
  planNutritionCatalogSearchFetch,
} from "@/lib/nutrition/nutrition-catalog-search-plan";

const QUERIES = [
  "idli",
  "idl",
  "id",
  "dosa",
  "dos",
  "vada",
  "vad",
  "sambar",
  "sam",
  "upma",
  "upm",
  "paneer",
  "chicken",
  "rice",
];

async function main() {
  const db = getFirestoreDb();
  const repo = new NutritionFoodCatalogRepository(db);
  const col = db.collection("nutritionFoodCatalog");

  const idliSnap = await col.doc("indb:ASC144").get();
  console.log("=== INDB Idli doc indb:ASC144 ===");
  if (!idliSnap.exists) {
    console.log("MISSING: indb:ASC144 not in catalog");
  } else {
    const d = idliSnap.data()!;
    console.log({
      foodId: idliSnap.id,
      isActive: d.isActive,
      source: d.source,
      name: d.name,
      nameLower: d.nameLower,
      displayName: d.displayName,
      canonicalKey: d.canonicalKey,
      hasIdliPrefix: Array.isArray(d.searchPrefixes)
        ? d.searchPrefixes.includes("idli")
        : false,
      prefixCount: d.searchPrefixes?.length,
    });
  }

  const prefixQuery = await col
    .where("isActive", "==", true)
    .where("searchPrefixes", "array-contains", "idli")
    .limit(5)
    .get();
  console.log(
    `searchPrefixes array-contains "idli": ${prefixQuery.size} docs (sample ids)`,
    prefixQuery.docs.map((x) => x.id),
  );

  for (const query of QUERIES) {
    const plan = planNutritionCatalogSearchFetch(query);
    const plannedQueries = countPlannedFirestoreQueries(plan);
    const t0 = performance.now();
    const candidates = await repo.searchByQuery(platformContext, { query });
    const t1 = performance.now();
    const ranked = rankNutritionFoodSearchResults(query, candidates);
    const afterGate = candidates.filter((d) =>
      passesNutritionSearchRelevanceGate(query, d),
    );
    const t2 = performance.now();
    console.log(
      JSON.stringify({
        query,
        plannedFirestoreQueries: plannedQueries,
        firestoreMs: Math.round(t1 - t0),
        totalMs: Math.round(t2 - t0),
        candidates: candidates.length,
        afterGate: afterGate.length,
        results: ranked.length,
        top: ranked.slice(0, 3).map((r) => catalogDocToSearchResult(r).name),
      }),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
