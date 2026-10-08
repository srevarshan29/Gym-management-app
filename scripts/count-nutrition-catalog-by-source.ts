/**
 * Read-only: count nutritionFoodCatalog docs by source.
 * Usage: node --env-file=.env --import tsx scripts/count-nutrition-catalog-by-source.ts
 */
import { getFirestoreDb } from "@/lib/firebase/admin";

async function main() {
  const db = getFirestoreDb();
  const col = db.collection("nutritionFoodCatalog");
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "(unset)";

  const sources = ["indb", "USDA", "cc0"] as const;
  const counts: Record<string, number> = {};

  for (const source of sources) {
    const snap = await col.where("source", "==", source).count().get();
    counts[source] = snap.data().count;
  }

  const idliDoc = await col.doc("indb:ASC144").get();

  console.log(
    JSON.stringify({
      firebaseProjectId: projectId,
      counts,
      idliAsc144: idliDoc.exists
        ? {
            isActive: idliDoc.data()?.isActive,
            name: idliDoc.data()?.name,
            hasIdliPrefix: Array.isArray(idliDoc.data()?.searchPrefixes)
              ? idliDoc.data()!.searchPrefixes.includes("idli")
              : false,
          }
        : null,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
