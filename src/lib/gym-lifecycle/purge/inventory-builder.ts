import type { Firestore } from "firebase-admin/firestore";

import { GYM_TENANT_FIRESTORE_COLLECTIONS, type GymTenantInventory } from "@/lib/gym-lifecycle/purge/inventory";

export async function buildGymTenantInventory(
  db: Firestore,
  gymId: string,
): Promise<GymTenantInventory> {
  const counts: Record<string, number> = {};
  let totalDocuments = 0;

  await Promise.all(
    GYM_TENANT_FIRESTORE_COLLECTIONS.map(async (collection) => {
      const snap = await db
        .collection(collection)
        .where("gymId", "==", gymId)
        .count()
        .get();
      const count = snap.data().count;
      counts[collection] = count;
      totalDocuments += count;
    }),
  );

  return { gymId, counts, totalDocuments };
}