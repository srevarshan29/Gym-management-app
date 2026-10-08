import {
  type DocumentData,
  FieldPath,
  type Firestore,
  type Query,
} from "firebase-admin/firestore";

import {
  CATALOG_SEARCH_PREFIX_MIN_LENGTH,
  catalogNamePrefixEnd,
  normalizeCatalogSearchQuery,
  tokenizeCatalogSearchQuery,
} from "@/lib/exercises/catalog-search";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { FirestoreContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import {
  NUTRITION_MERGED_CANDIDATE_LIMIT,
  NUTRITION_PREFIX_FETCH_PER_TOKEN,
  NUTRITION_SEARCH_MIN_CHARS,
  nutritionCatalogSearchTokens,
  nutritionSearchQueryMeetsMinLength,
} from "@/lib/nutrition/food-search";

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

    const tokens = nutritionCatalogSearchTokens(options.query);
    const queryTokens = tokenizeCatalogSearchQuery(options.query);

    const mergedCap = Math.min(
      options.limit ?? NUTRITION_MERGED_CANDIDATE_LIMIT,
      NUTRITION_MERGED_CANDIDATE_LIMIT,
    );
    const perTokenLimit = Math.min(
      NUTRITION_PREFIX_FETCH_PER_TOKEN,
      Math.max(60, Math.ceil(mergedCap / Math.max(1, tokens.length || 1))),
    );

    const byFoodId = new Map<string, DocWithId<NutritionFoodCatalogDoc>>();
    const normalizedQuery = normalizeCatalogSearchQuery(options.query);
    if (normalizedQuery.length >= NUTRITION_SEARCH_MIN_CHARS) {
      const nameRows = await this.searchByNameLowerPrefix(
        ctx,
        normalizedQuery,
        Math.min(32, mergedCap),
      );
      for (const row of nameRows) {
        byFoodId.set(row.foodId, row);
      }
    }

    for (const token of queryTokens) {
      if (
        token.length >= NUTRITION_SEARCH_MIN_CHARS &&
        token.length < CATALOG_SEARCH_PREFIX_MIN_LENGTH
      ) {
        const shortRows = await this.searchByNameLowerPrefix(
          ctx,
          token,
          Math.min(48, mergedCap),
        );
        for (const row of shortRows) {
          byFoodId.set(row.foodId, row);
        }
      }
    }

    for (const token of tokens) {
      const rows = await this.searchByPrefixToken(ctx, token, perTokenLimit);
      for (const row of rows) {
        byFoodId.set(row.foodId, row);
      }
    }

    return [...byFoodId.values()].slice(0, mergedCap);
  }
}
