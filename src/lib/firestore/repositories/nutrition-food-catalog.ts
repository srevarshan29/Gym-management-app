import {
  type DocumentData,
  FieldPath,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";

import {
  CATALOG_SEARCH_PREFIX_MIN_LENGTH,
  catalogNamePrefixEnd,
} from "@/lib/exercises/catalog-search";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import {
  NUTRITION_MERGED_CANDIDATE_LIMIT,
  NUTRITION_SEARCH_MIN_CHARS,
  nutritionSearchQueryMeetsMinLength,
} from "@/lib/nutrition/food-search";
import { planNutritionCatalogSearchFetch } from "@/lib/nutrition/nutrition-catalog-search-plan";

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

  async getByFoodIds(
    ctx: FirestoreContext,
    foodIds: string[],
  ): Promise<DocWithId<NutritionFoodCatalogDoc>[]> {
    this.assertServerReadAccess(ctx);
    const uniqueIds = [...new Set(foodIds)].filter(Boolean);
    if (uniqueIds.length === 0) return [];

    const refs = uniqueIds.map((foodId) => this.collection().doc(foodId));
    const snaps = await this.db.getAll(...refs);

    return snaps
      .map((snap) => this.fromSnapshot(snap.id, snap.data()))
      .filter((d): d is DocWithId<NutritionFoodCatalogDoc> => d !== null)
      .filter((d) => d.isActive);
  }

  private async searchByNameLowerPrefix(
    ctx: FirestoreContext,
    prefix: string,
    limit: number,
  ): Promise<DocWithId<NutritionFoodCatalogDoc>[]> {
    const normalized = prefix.trim().toLowerCase();
    if (normalized.length < NUTRITION_SEARCH_MIN_CHARS) {
      return [];
    }

    const query: Query = this.collection()
      .where("isActive", "==", true)
      .where("nameLower", ">=", normalized)
      .where("nameLower", "<", catalogNamePrefixEnd(normalized))
      .orderBy("nameLower", "asc")
      .orderBy(FieldPath.documentId(), "asc")
      .limit(limit);

    const snap = await query.get();
    return snap.docs
      .map((d) => this.fromSnapshot(d.id, d.data()))
      .filter((d): d is DocWithId<NutritionFoodCatalogDoc> => d !== null);
  }

  private async searchByPrefixToken(
    ctx: FirestoreContext,
    token: string,
    limit: number,
  ): Promise<DocWithId<NutritionFoodCatalogDoc>[]> {
    if (token.length < CATALOG_SEARCH_PREFIX_MIN_LENGTH) {
      return [];
    }

    const query: Query = this.collection()
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

  async searchByQuery(
    ctx: FirestoreContext,
    options: { query: string; limit?: number },
  ): Promise<DocWithId<NutritionFoodCatalogDoc>[]> {
    this.assertServerReadAccess(ctx);
    if (!nutritionSearchQueryMeetsMinLength(options.query)) {
      return [];
    }

    const plan = planNutritionCatalogSearchFetch(options.query);
    const mergedCap = Math.min(
      options.limit ?? plan.mergedCap,
      NUTRITION_MERGED_CANDIDATE_LIMIT,
      plan.mergedCap,
    );
    const nameLowerLimit = Math.min(48, mergedCap);

    const fetchTasks: Promise<DocWithId<NutritionFoodCatalogDoc>[]>[] = [];

    for (const prefix of plan.nameLowerPrefixes) {
      fetchTasks.push(
        this.searchByNameLowerPrefix(ctx, prefix, nameLowerLimit),
      );
    }

    for (const token of plan.prefixTokens) {
      fetchTasks.push(
        this.searchByPrefixToken(ctx, token, plan.perTokenLimit),
      );
    }

    const resultSets = await Promise.all(fetchTasks);
    const byFoodId = new Map<string, DocWithId<NutritionFoodCatalogDoc>>();
    for (const rows of resultSets) {
      for (const row of rows) {
        byFoodId.set(row.foodId, row);
      }
    }

    return [...byFoodId.values()].slice(0, mergedCap);
  }
}
