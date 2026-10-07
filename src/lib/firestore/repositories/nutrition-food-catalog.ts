import {
  type DocumentData,
  FieldPath,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";

import {
  CATALOG_SEARCH_PREFIX_MIN_LENGTH,
  primaryCatalogSearchToken,
} from "@/lib/exercises/catalog-search";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";

const MAX_FOOD_SEARCH_RESULTS = 25;

function clampFoodSearchLimit(limit?: number): number {
  if (limit === undefined || limit <= 0) return MAX_FOOD_SEARCH_RESULTS;
  return Math.min(limit, MAX_FOOD_SEARCH_RESULTS);
}

/**
 * Platform-global nutrition catalog — client rules deny access; Admin SDK only.
 */
export class NutritionFoodCatalogRepository {
  constructor(private readonly db: Firestore) {}

  private collection() {
    return this.db.collection(COLLECTIONS.nutritionFoodCatalog);
  }

  private fromSnapshot(
    id: string,
    data: DocumentData | undefined,
  ): DocWithId<NutritionFoodCatalogDoc> | null {
    if (!data) return null;
    return { id, ...(data as NutritionFoodCatalogDoc) };
  }

  private assertServerReadAccess(ctx: FirestoreContext): void {
    if (
      ctx.kind === "platform" ||
      ctx.kind === "super_admin" ||
      ctx.kind === "staff" ||
      ctx.kind === "member"
    ) {
      return;
    }
    throw new Error("Unauthorized nutrition catalog read.");
  }

  async getByFoodId(
    ctx: FirestoreContext,
    foodId: string,
  ): Promise<DocWithId<NutritionFoodCatalogDoc> | null> {
    this.assertServerReadAccess(ctx);
    const snap = await this.collection().doc(foodId).get();
    if (!snap.exists) return null;
    const doc = this.fromSnapshot(snap.id, snap.data());
    if (!doc || !doc.isActive) return null;
    return doc;
  }

  async searchByQuery(
    ctx: FirestoreContext,
    options: { query: string; limit?: number },
  ): Promise<DocWithId<NutritionFoodCatalogDoc>[]> {
    this.assertServerReadAccess(ctx);
    const token = primaryCatalogSearchToken(options.query);
    if (!token || token.length < CATALOG_SEARCH_PREFIX_MIN_LENGTH) {
      return [];
    }

    const limit = clampFoodSearchLimit(options.limit);

    let query: Query = this.collection()
      .where("isActive", "==", true)
      .where("searchPrefixes", "array-contains", token)
      .orderBy("nameLower", "asc")
      .orderBy(FieldPath.documentId(), "asc")
      .limit(limit);

    const snap = await query.get();
    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<NutritionFoodCatalogDoc> => d !== null);
  }
}
