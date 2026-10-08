/**
 * One-off catalog cleanup for sweet potato search (no full re-import).
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/patch-nutrition-sweet-potato-catalog.ts
 *   node --env-file=.env --import tsx scripts/patch-nutrition-sweet-potato-catalog.ts --dry-run
 */
import { Timestamp } from "firebase-admin/firestore";

import { buildCatalogSearchPrefixes } from "@/lib/exercises/catalog-search";
import { getFirestoreDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";

const DEACTIVATE_FOOD_IDS = ["usda:168015"];

function parseDryRun(argv: string[]): boolean {
  return argv.includes("--dry-run");
}

async function main() {
  const dryRun = parseDryRun(process.argv.slice(2));
  const db = getFirestoreDb();
  const col = db.collection(COLLECTIONS.nutritionFoodCatalog);
  const now = Timestamp.now();

  for (const foodId of DEACTIVATE_FOOD_IDS) {
    const ref = col.doc(foodId);
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`skip missing ${foodId}`);
      continue;
    }
    console.log(
      dryRun ? "[dry-run] deactivate" : "deactivate",
      foodId,
      snap.data()?.name,
    );
    if (!dryRun) {
      await ref.update({ isActive: false, updatedAt: now });
    }
  }

  const leavesSnap = await col.where("isActive", "==", true).get();
  let leavesPatched = 0;
  for (const doc of leavesSnap.docs) {
    const nameLower = String(doc.data().nameLower ?? "");
    if (!/\bsweet potato(?:es)?\b/.test(nameLower) || !/\bleaves\b/.test(nameLower)) {
      continue;
    }
    const name = String(doc.data().name ?? "");
    const displayName = "Sweet Potato Leaves";
    const prefixes = new Set<string>();
    for (const label of [name, displayName]) {
      for (const p of buildCatalogSearchPrefixes(label)) {
        prefixes.add(p);
      }
    }
    console.log(
      dryRun ? "[dry-run] patch leaves" : "patch leaves",
      doc.id,
      name,
    );
    if (!dryRun) {
      await doc.ref.update({
        canonicalKey: "vegetable:sweet-potato-leaves",
        displayName,
        searchPrefixes: [...prefixes].sort(),
        updatedAt: now,
      });
    }
    leavesPatched += 1;
  }

  console.log(JSON.stringify({ dryRun, leavesPatched }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
